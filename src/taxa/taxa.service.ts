import { HttpException, Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";
import {
	ChecklistVersion, GetSpeciesAggregateDto, GetSpeciesPageDto, GetTaxaAggregateDto, GetTaxaChildrenDto,
	GetTaxaDescriptionsDto, GetTaxaPageDto, GetTaxaParentsDto, GetTaxonDto, TaxaBaseQuery, TaxaSearchDto,
	Taxon, TaxonElastic
} from "./taxa.dto";
import { TAXA_CLIENT, TAXA_ELASTIC_CLIENT } from "src/provider-tokens";
import { JSONObjectSerializable, MaybeArray } from "src/typing.utils";
import { asArray } from "src/utils";
import { paginateAlreadyPaginated } from "src/pagination.utils";
import { ElasticResponse, queryToElasticQuery } from "./taxa-elastic-query";

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
		@Inject(TAXA_ELASTIC_CLIENT) private taxaElasticClient: RestClientService<JSONObjectSerializable>
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

	private elasticSearch(query: Partial<TaxaBaseQuery>, taxon?: TaxonElastic) {
		return this.taxaElasticClient.post<ElasticResponse>(
			`taxon_${CHECKLIST_VERSION_MAP[query.checklistVersion!]}/taxa/_search`,
			queryToElasticQuery(query, taxon)
		);
	}

	async getPage(query: GetTaxaPageDto) {
		if (query.parentTaxonId) {
			const isPartOfProp = query.includeHidden ? "parents" : "nonHiddenParents";
			query[isPartOfProp] = query.parentTaxonId;
		}
		if (query.id) {
			query[query.includeHidden ? "parentsIncludeSelf" : "nonHiddenParentsIncludeSelf"] = query.id;
			delete query.id;
		}

		return pageAdapter(await this.elasticSearch(query), query);
	}

	async getAggregate(query: GetTaxaAggregateDto) {
		return mapResponseAggregations((await this.elasticSearch(query)).aggregations, query.aggregateBy);
	}

	async getSpeciesPage(query: GetSpeciesPageDto) {
		return this.getPage({ ...query, species: true });
	}

	async getSpeciesAggregate(query: GetSpeciesAggregateDto) {
		return mapResponseAggregations(
			(await this.elasticSearch({ ...query, species: true })).aggregations,
			query.aggregateBy
		);
	}

	async getBySubject(id: string, query: GetTaxonDto = {}) {
		const [taxon] =  (await this.elasticSearch({
			id,
			checklistVersion: ChecklistVersion.current,
			...query
		})).hits.hits;
		if (!taxon) {
			throw new HttpException("Taxon not found", 404);
		}
		return taxon._source;
	}

	async getChildren(id: string, query: GetTaxaChildrenDto) {
		const taxon = await this.getBySubject(id);
		const childrenQuery: Partial<TaxaBaseQuery> = {
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
		if (childrenQuery.includeHidden) {
			childrenQuery.parents = id;
		} else {
			childrenQuery.nonHiddenParents = id;
		}

		return arrayAdapter(await this.elasticSearch(childrenQuery, taxon), query);
	}

	async getTaxonParents(id: string, query: GetTaxaParentsDto) {
		const taxon = await this.getBySubject(id, { selectedFields: ["nonHiddenParents"] });
		const parents = await this.elasticSearch({
			ids: taxon.nonHiddenParents,
			checklistVersion: ChecklistVersion.current,
			sortOrder: "taxonomic",
			pageSize: 10000,
			...query
		});
		return arrayAdapter(parents, query);
	}

	async getTaxonSpeciesPage(id: string, query: GetTaxaPageDto) {
		return this.getPage({ ...query, species: true, id });
	}

	async getTaxonSpeciesAggregate(id: string, query: GetTaxaAggregateDto) {
		return this.getAggregate({ ...query, species: true, id });
	}


	async getTaxonDescriptions(id: string, query: GetTaxaDescriptionsDto) {
		return (await this.getBySubject(id, { ...query, selectedFields: ["descriptions"] })).descriptions || [];
	}

	async getTaxonMedia(id: string, query: GetTaxaDescriptionsDto) {
		return (await this.getBySubject(id, { ...query, selectedFields: ["multimedia"] })).multimedia;
	}
}

const pageAdapter = ({ hits }: ElasticResponse, query: GetTaxaPageDto) =>
	paginateAlreadyPaginated({
		results: hits.hits.map(({ _source }) =>  mapPageItem(_source, query)),
		total: hits.total,
		pageSize: query.pageSize!,
		currentPage: query.page!
	});

const arrayAdapter = ({ hits }: ElasticResponse, query: Partial<TaxaBaseQuery>) =>
	hits.hits.map(({ _source }) =>  mapPageItem(_source, query));

const mapPageItem = (taxon: TaxonElastic, query: Partial<TaxaBaseQuery>) =>
	query.includeHidden
		? { ...taxon, parents: taxon.nonHiddenParents }
		: taxon;

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
