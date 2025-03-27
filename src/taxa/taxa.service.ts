import { HttpException, Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";
import {
	AllQueryParams, ChecklistVersion, GetTaxaAggregateDto, GetTaxaDescriptionsDto, GetTaxaPageDto, GetTaxaResultsDto,
	GetTaxonDto, TaxaBaseQuery, TaxaSearchDto, Taxon, TaxonElastic
} from "./taxa.dto";
import { TAXA_CLIENT, TAXA_ELASTIC_CLIENT } from "src/provider-tokens";
import { JSONObjectSerializable, MaybeArray } from "src/typing.utils";
import { asArray, parseURIFragmentIdentifierRepresentation, pipe } from "src/utils";
import { paginateAlreadyPaginated } from "src/pagination.utils";
import { ElasticResponse, TaxaFilters, buildElasticQuery } from "./taxa-elastic-query";
import { OpenAPIObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { JSONSchema, JSONSchemaObject, TypedJSONSchema, isJSONSchemaArray, isJSONSchemaObject, isJSONSchemaRef }
	from "src/json-schema.utils";
import { SwaggerService } from "src/swagger/swagger.service";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";

const CHECKLIST_VERSION_MAP: Record<ChecklistVersion, string> = {
	"current": "current",
	"MR.424": "mr_424",
	"MR.425": "mr_425",
	"MR.426": "mr_426",
	"MR.427": "mr_427",
	"MR.428": "mr_428",
	"MR.484": "mr_484",
};

@Injectable()
export class TaxaService {

	constructor(
		@Inject(TAXA_CLIENT) private taxaClient: RestClientService<Taxon>,
		@Inject(TAXA_ELASTIC_CLIENT) private taxaElasticClient: RestClientService<JSONObjectSerializable>,
		private swaggerService: SwaggerService
	) {}

	async get(id: string, selectedFields?: MaybeArray<string>): Promise<Taxon> {
		const query: TaxaSearchDto = { q: id };
		if (selectedFields) {
			query.selectedFields = asArray(selectedFields).join(",");
		}

		const matches = (await this.search(query));
		const [match] = matches;
		if (!match) {
			throw new HttpException("Taxon not found", 404);
		}
		return match;
	}

	async search(query: TaxaSearchDto) {
		const { matches } = (await this.taxaClient.get<{ matches: Taxon[]; }>("", { params: query }));
		return matches || [];
	}

	private async elasticSearch(query: Partial<AllQueryParams>, filters?: TaxaFilters, taxon?: TaxonElastic) {
		return this.taxaElasticClient.post<ElasticResponse>(
			`taxon_${CHECKLIST_VERSION_MAP[query.checklistVersion!]}/taxa/_search`,
			buildElasticQuery(query, filters, await this.getFiltersSchema(), taxon)
		);
	}

	async getPage(query: GetTaxaPageDto, filters: TaxaFilters = {}) {
		if (query.parentTaxonId) {
			const isPartOfProp = query.includeHidden ? "parents" : "nonHiddenParents";
			filters[isPartOfProp] = query.parentTaxonId;
		}
		return pageAdapter(await this.elasticSearch(query, filters), query);
	}

	async getAggregate(query: GetTaxaAggregateDto, filters?: TaxaFilters) {
		return mapResponseAggregations((await this.elasticSearch(query, filters)).aggregations, query.aggregateBy);
	}

	async getSpeciesPage(query: GetTaxaPageDto, filters?: TaxaFilters) {
		return this.getPage(query, { species: true, ...(filters || {}) });
	}

	async getSpeciesAggregate(query: GetTaxaAggregateDto, filters?: TaxaFilters) {
		return mapResponseAggregations(
			(await this.elasticSearch(query, { species: true, ...(filters || {}) })).aggregations,
			query.aggregateBy
		);
	}

	async getBySubject(id: string, query: GetTaxonDto = {}) {
		const [taxon] =  (await this.elasticSearch({
			id: [id],
			checklistVersion: ChecklistVersion.current,
			...query
		})).hits.hits;
		if (!taxon) {
			throw new HttpException("Taxon not found", 404);
		}
		return mapTaxon(taxon._source, query);
	}

	async getChildren(id: string, query: GetTaxaResultsDto) {
		const taxon = await this.getBySubject(id);
		const childrenQuery: Partial<AllQueryParams> = {
			...query,
			checklist: taxon.nameAccordingTo || "MR.1",
			pageSize: 10000, // This has worked so far to get all taxa...
			depth: true
		};
		const depthProp = query.includeHidden ? "depth" : "nonHiddenDepth";
		if (childrenQuery.selectedFields) {
			childrenQuery.selectedFields = [
				...childrenQuery.selectedFields,
				query.includeHidden ? "isPartOf" : "isPartOfNonHidden",
				depthProp,
				"nameAccordingTo"
			];
		}
		const filters: TaxaFilters = {};
		if (childrenQuery.includeHidden) {
			filters.parents = id;
		} else {
			filters.nonHiddenParents = id;
		}

		return arrayAdapter(await this.elasticSearch(childrenQuery, undefined, taxon), query);
	}

	async getTaxonParents(id: string, query: GetTaxaResultsDto) {
		const taxon = await this.getBySubject(id, { selectedFields: ["nonHiddenParents"] });
		const parentIds = taxon.nonHiddenParents;
		if (!parentIds) {
			return [];
		}
		const parents = await this.elasticSearch({
			id: parentIds,
			checklistVersion: ChecklistVersion.current,
			sortOrder: "taxonomic",
			pageSize: 10000,
			...query
		});
		return arrayAdapter(parents, query);
	}

	async getTaxonSpeciesPage(id: string, query: GetTaxaPageDto) {
		const filters: TaxaFilters = { species: true };
		filters[query.includeHidden ? "parentsIncludeSelf" : "nonHiddenParentsIncludeSelf"] = id;
		return this.getPage(query, filters);
	}

	async getTaxonSpeciesAggregate(id: string, query: GetTaxaAggregateDto) {
		const filters: TaxaFilters = { species: true };
		filters[query.includeHidden ? "parentsIncludeSelf" : "nonHiddenParentsIncludeSelf"] = id;
		return this.getAggregate(query, { species: true, id });
	}

	async getTaxonDescriptions(id: string, query: GetTaxaDescriptionsDto) {
		return (await this.getBySubject(id, { ...query, selectedFields: ["descriptions"] })).descriptions || [];
	}

	async getTaxonMedia(id: string, query: GetTaxaDescriptionsDto) {
		return (await this.getBySubject(id, { ...query, selectedFields: ["multimedia"] })).multimedia;
	}

	@IntelligentMemoize()
	async getFiltersSchema() {
		return getFiltersSchema(await this.swaggerService.getLajiBackendSwaggerDoc());
	}
}

export const getFiltersSchema = (remoteDoc: OpenAPIObject) => {
	const schema = remoteDoc.components!.schemas!.Taxon as JSONSchemaObject;
	return jsonSchemaIntoFiltersJsonSchema(schema, remoteDoc);
};

const jsonSchemaIntoFiltersJsonSchema = (schema: JSONSchemaObject, swagger: OpenAPIObject): JSONSchemaObject => {
	const collectProperties = (schema: JSONSchema, path: string[]): { path: string[], schema: JSONSchema }[] => {
		if (isJSONSchemaRef(schema)) {
			schema = parseURIFragmentIdentifierRepresentation(swagger, schema.$ref);
			return collectProperties(schema, path);
		} else if (isJSONSchemaObject(schema)) {
			return Object.keys(schema.properties || {}).reduce((collected, property) => {
				return [
					...collected,
					...collectProperties((schema as JSONSchemaObject).properties![property]!, [...path, property])
				];
			}, []);
		} else if (isJSONSchemaArray(schema)) {
			return collectProperties(schema.items, path);
		} else if ((schema as TypedJSONSchema).type === "string") {
			return [{
				path,
				schema: { oneOf: [
					{ type: "string" },
					{
						type: "array",
						items: { "type": "string" }
					}
				] }
			}];
		} else if ((schema as TypedJSONSchema).type === "boolean") {
			return [{ path, schema: { type: "boolean" } }];
		}
		return [];
	};

	return {
		type: "object",
		properties: collectProperties(schema, []).reduce((properties, { path, schema }) => {
			properties[path.join(".")] = schema;
			return properties;
		}, {} as Record<string, JSONSchema>)
	};
};

const pageAdapter = ({ hits }: ElasticResponse, query: GetTaxaPageDto) =>
	paginateAlreadyPaginated({
		results: hits.hits.map(({ _source }) =>  mapTaxon(_source, query)),
		total: hits.total,
		pageSize: query.pageSize!,
		currentPage: query.page!
	});

const arrayAdapter = ({ hits }: ElasticResponse, query: Partial<TaxaBaseQuery>) =>
	hits.hits.map(({ _source }) =>  mapTaxon(_source, query));

const mapTaxonParents = (query: Partial<AllQueryParams>) => (taxon: TaxonElastic): TaxonElastic =>
	query.includeHidden
		? { ...taxon, parents: taxon.nonHiddenParents } as unknown as TaxonElastic
		: taxon;

const addVernacularNameTranslations = (taxon: TaxonElastic) => ({
	...taxon,
	vernacularNameFi: taxon.vernacularName?.fi,
	vernacularNameSv: taxon.vernacularName?.sv,
	vernacularNameEn: taxon.vernacularName?.en,
});

const mapTaxon = (taxon: TaxonElastic, query: Partial<AllQueryParams>)
	: TaxonElastic =>
	pipe(
		mapTaxonParents(query),
		addVernacularNameTranslations
	)(taxon);

const mapResponseAggregations = (
	aggsResult: ElasticResponse["aggregations"],
	aggregateBy: GetTaxaAggregateDto["aggregateBy"]
) => {
	if (!aggregateBy) {
		return undefined;
	}

	const result: any = {};
	aggregateBy.forEach(fieldsString => {
		const parts = fieldsString.split("=");
		const fields = parts[0]!.split(",");
		const aggName = parts[1] || fieldsString;
		result[aggName] = result[aggName] || [];
		processAggsResult(fields, aggsResult, result[aggName]);
	});

	return result;
};

const processAggsResult = (fields: string[], aggsResult: any, results: any[] = [], values: any = {}) => {
	const [field, ...nextFields] = fields;

	if (!field) {
		return;
	}

	if (!field
		|| !aggsResult[field]
		|| !Array.isArray(aggsResult[field].buckets)
		|| aggsResult[field].buckets.length === 0
	) {
		results.push({ values, count: 0 });
		return;
	}

	aggsResult[field].buckets.forEach((bucket: any) => {
		const newValues = { ...values, [field]: bucket["key"] };

		if (nextFields.length > 0 && bucket[nextFields[0]!]) {
			processAggsResult(nextFields, bucket, results, newValues);
			return;
		}

		results.push({ values: newValues, count: bucket["doc_count"] });
	});
};
