import { HttpException, Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ChecklistVersion, GetTaxaAggregateDto, GetTaxaChildrenDto, GetTaxaPageDto, GetTaxonDto, TaxaBaseQuery, Taxon, TaxonElastic }
	from "./taxa.dto";
import { TAXA_CLIENT, TAXA_ELASTIC_CLIENT } from "src/provider-tokens";
import { JSONObjectSerializable, MaybeArray } from "src/typing.utils";
import { asArray, firstFromNonEmptyArr } from "src/utils";
import { paginateAlreadyPaginated } from "src/pagination.utils";

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
		const query: JSONObjectSerializable = { q: id };
		if (selectedFields) {
			query.selectedFields = asArray(selectedFields).join(",");
		}
		const { matches } = (await this.taxaClient.get<{ matches: Taxon[]; }>("", { params: query }));
		const [match] = matches;
		if (!match) {
			throw new HttpException("Taxon not found", 404);
		}
		return match;
	}

	private search(query: Partial<TaxaBaseQuery>) {
		return this.elasticSearch(queryToElasticQuery(query), query.checklistVersion!);
	}

	private elasticSearch(query: ElasticQuery, checklistVersion: ChecklistVersion) {
		return this.taxaElasticClient.post<ElasticResponse>(
			`taxon_${CHECKLIST_VERSION_MAP[checklistVersion!]}/taxa/_search`,
			query
		);
	}

	async getPage(query: GetTaxaPageDto) {
		if (query.parentTaxonId) {
			const isPartOfProp = query.includeHidden ? "parents" : "nonHiddenParents";
			query[isPartOfProp] = query.parentTaxonId;
		}
		return pageAdapter(await this.search(query), query);
	}

	async getAggregate(query: GetTaxaAggregateDto) {
		return mapResponseAggregations((await this.search(query)).aggregations, query.aggregateBy);
	}

	async getBySubject(id: string, query: GetTaxonDto = {}) {
		const [taxon] = (await this.search({ ...query, id, checklistVersion: ChecklistVersion.current })).hits.hits;
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
			pageSize: 10000 // This has worked so far to get all taxa...
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

		const childrenElasticQuery = queryToElasticQuery(childrenQuery);

		childrenElasticQuery.query.bool.must = {
			...(childrenElasticQuery.query.bool.must || {}),
			range: {
				[depthProp]: { gte: taxon[depthProp], lte: taxon[depthProp] + 1 }
			}
		};

		return resultsAdapter(
			await this.elasticSearch(childrenElasticQuery, childrenQuery.checklistVersion!),
			query
		);
	}
}

type ElasticQuery = {
	from?: number;
	pageSize?: number;
	size?: number;
	parents?: string;
	nonHiddenParents?: string;
	sort?: Record<string, { order: "asc" | "desc" }>[];
	aggs?: JSONObjectSerializable;

	finnish?: boolean;
	invasiveSpecies?: boolean;
	informalTaxonGroups?: string[];
	typeOfOccurrenceInFinland?: string[];

	// added now when doing the query param mapping. Are they really arrays?
	administrativeStatuses?: string[];
	"latestRedListStatusFinland.status"?: string[];
	taxonRank?: string[];
	hasMultimedia?: boolean;
	hasDescriptions?: boolean;
	hasBold?: boolean;
	nameAccordingTo?: string;
	"primaryHabitat.habitat"?: string[];
	anyHabitatSearchStrings?: string[];
	"latestRedListEvaluation.primaryHabitatSearchStrings"?: string[];
	"latestRedListEvaluation.anyHabitatSearchStrings"?: string[];

	query: {
		bool: {
			filter?: { term: Record<string, MaybeArray<string | number | boolean>> }[];
			must_not?: { terms: Record<string, MaybeArray<string>> }[];
			must?: { range: Record<string,  { gte: number, lte: number }> };
		}
	};
	_source: { excludes: string[] } | string[];
};

type AggregateNode = Record<string, { terms: { field: string, size: number }, aggs?: AggregateNode }>;

const mapAggs = (aggs: AggregateNode | undefined, fields: string[], size: number): AggregateNode | undefined => {
	const [field, ...remainingFields] = fields;
	if (!field) {
		return aggs;
	}

	const existingAggsForField = (aggs?.[field] || {}) as AggregateNode[string];
	return {
		...aggs,
		[field]: {
			terms: { field, size },
			aggs: mapAggs(existingAggsForField.aggs, remainingFields, size)
		}
	};
};

const mapAggregates = ({ aggregateBy, aggregateSize }: GetTaxaAggregateDto) =>
	aggregateBy.reduce((aggs, aggsString) => {
		const aggsFields = firstFromNonEmptyArr(aggsString.split("=")).split(",");
		return mapAggs(aggs, aggsFields, aggregateSize) as AggregateNode;
	}, {} as AggregateNode);


type ElasticResponse = {
	hits: { total: number,  hits: { _source: TaxonElastic }[] };
	aggregations: JSONObjectSerializable;
};

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

const sortOrders = {
	taxonomic: "taxonomicOrder",
	scientific_name: "scientificName",
	finnish_name: "vernacularName.fi"
} as const;
const mapSortOrder = ({ sortOrder }: GetTaxaPageDto) => {
	if (!sortOrder) {
		return undefined;
	}
	const [sortField, order = "asc"] = sortOrder.split(" ") as [string, ...string[]];
	const mappedSortField: string | undefined = (sortOrders as any)[sortField];
	if (!mappedSortField) {
		// eslint-disable-next-line max-len
		throw new HttpException("Bad 'sortOrder'. Should be one of 'taxonomic' | 'scientific_name' | 'finnish_name'", 422);
	}
	if (order !== "asc" && order !== "desc") {
		throw new HttpException("Bad sort direction in 'sortOrder'. Should be one of 'asc' | 'desc'", 422);
	}
	return [{ [mappedSortField]: { order: order as ("asc" | "desc") } }];
};

type QueryParamStrategy<T extends ElasticQuery = ElasticQuery> = (
	query: Partial<TaxaBaseQuery>,
	queryParam: keyof TaxaBaseQuery,
	elasticQ: T,
) => T;

/** Map to given **elasticQParam with** the given strategy */
const mapToElasticParamAs = <T extends ElasticQuery, K extends keyof T>(
	elasticQParam: K
) => (
		injectionalStrategy: (query: Partial<TaxaBaseQuery>, queryParam: keyof TaxaBaseQuery) => T[K]
	): QueryParamStrategy<T> => (
		query, queryParam, elasticQ
	) => {
		elasticQ[elasticQParam] = injectionalStrategy(query, queryParam);
		return elasticQ;
	};

const mapAs = (elasticQParam: keyof ElasticQuery) =>
	mapToElasticParamAs(elasticQParam)((query, queryParam) => query[queryParam]);

const ifIs = (
	condition: boolean | ((arg: unknown) => boolean)
) => (
	strategy: QueryParamStrategy
): QueryParamStrategy => (
	query, queryParam, elasticQ
) => {
	if (typeof condition === "function" && condition(query[queryParam]) || query[queryParam] === condition) {
		return strategy(query, queryParam, elasticQ);
	}
	return elasticQ;
};

const ifIsTrue = ifIs(true);
const ifIsTruthy = ifIs((arg: unknown) => !!arg);
const ifIsFalsy = ifIs((arg: unknown) => !arg);
const ifIsTrueOrUndefined = ifIs((arg?: boolean) => [true, undefined].includes(arg));

const removeFromExclude = <T extends ElasticQuery>(...keys: string[])
	: QueryParamStrategy<T> => (_, __, elasticQ) => {
		// The defaults 'excludes' has been overridden by some other query param, so exclusion wouldn't make sense.
		if (!elasticQ._source || Array.isArray(elasticQ._source)) {
			return elasticQ;
		}
		return { ...elasticQ, _source: {
			...elasticQ._source,
			excludes: elasticQ._source.excludes.filter(s => !keys.includes(s))
		} };
	};

const mapTypesOfOccurrenceNotFilters: QueryParamStrategy = (query, queryParam, elasticQ) => {
	const { bool } = elasticQ.query;
	bool.must_not = bool.must_not || [];
	const arg = query[queryParam] as string[];
	bool.must_not.push({ terms: { "typesOfOccurrenceNotFilters": arg } });
	return elasticQ;
};

/** @param elasticQueryParam The elastic query filter param. Defaults to the input query param */
const addAsFilter = (elasticQFilterParam?: string): QueryParamStrategy => (query, queryParam, elasticQ) => {
	const { bool } = elasticQ.query;
	bool.filter = bool.filter || [];
	asArray(query[queryParam]!).forEach(queryArg => {
		bool.filter!.push({ term: { [elasticQFilterParam ?? queryParam]: queryArg } });
	});
	return elasticQ;
};

const bypass: QueryParamStrategy = (_, __, elasticQ) => elasticQ;

/**
 * The mapping between the incoming query and the elastic query.
 *
 * The keys are the incoming query params, and the values are strategies for how to map the query arguments into an elastic query.
 */
const queryParamToEsQueryParam: Record<keyof TaxaBaseQuery, QueryParamStrategy> = {
	aggregateBy: mapToElasticParamAs("aggs")(mapAggregates),
	aggregateSize: bypass,
	lang: bypass,
	langFallback: bypass,
	checklistVersion: bypass,
	parentTaxonId: bypass,
	page: mapToElasticParamAs("from")(({ page, pageSize }) => pageSize! * (page! - 1)),
	pageSize: mapAs("size"),
	sortOrder: mapToElasticParamAs("sort")(mapSortOrder),
	species: ifIsTrue(addAsFilter()),
	redListEvaluationGroups: ifIsTrue(addAsFilter()),
	invasiveSpeciesMainGroups: ifIsTrue(addAsFilter()),
	"latestRedListEvaluation.threatenedAtArea": ifIsTrue(addAsFilter()),
	"latestRedListEvaluation.redListStatus": ifIsTrue(addAsFilter()),
	"latestRedListEvaluation.primaryThreat": ifIsTrue(addAsFilter()),
	"latestRedListEvaluation.threats": ifIsTrue(addAsFilter()),
	"latestRedListEvaluation.primaryEndangermentReason": ifIsTrue(addAsFilter()),
	hasLatestRedListEvaluation: ifIsTrue(addAsFilter()),
	"latestRedListEvaluation.endangermentReasons": ifIsTrue(addAsFilter()),
	taxonSets: ifIsTruthy(addAsFilter()),
	onlyFinnish: ifIsTrueOrUndefined(addAsFilter("finnish")),
	invasiveSpeciesFilter: ifIsTrue(addAsFilter("invasiveSpecies")),
	informalGroupFilters: ifIsTrue(addAsFilter("informalTaxonGroups")),
	typesOfOccurrenceFilters: ifIsTrue(addAsFilter("typeOfOccurrenceInFinland")),
	typesOfOccurrenceNotFilters: mapTypesOfOccurrenceNotFilters,
	adminStatusFilters: ifIsTrue(addAsFilter("administrativeStatuses")),
	redListStatusFilters: ifIsTrue(addAsFilter("latestRedListStatusFinland.status")),
	taxonRanks: ifIsTrue(addAsFilter("taxonRank")),
	hasMediaFilter: ifIsTrue(addAsFilter("hasMultimedia")),
	hasDescriptionFilter: ifIsTrue(addAsFilter("hasDescriptions")),
	hasBoldData: ifIsTrue(addAsFilter("hasBold")),
	checklist: addAsFilter("nameAccordingTo"),
	primaryHabitat: ifIsTrue(addAsFilter("primaryHabitat.habitat")),
	anyHabitat: ifIsTrue(addAsFilter("anyHabitatSearchStrings")),
	"latestRedListEvaluation.primaryHabitat":
		ifIsTrue(addAsFilter("latestRedListEvaluation.primaryHabitatSearchStrings")),
	"latestRedListEvaluation.anyHabitat":
	ifIsTrue(addAsFilter("latestRedListEvaluation.anyHabitatSearchStrings")),
	selectedFields: mapAs("_source"),
	includeMedia: ifIsTrue(removeFromExclude("multimedia")),
	includeRedListEvaluations: ifIsTrue(
		removeFromExclude("redListEvaluations", "latestRedListEvaluation")
	),
	includeDescriptions: ifIsTrue(removeFromExclude("descriptions")),
	includeHidden: ifIsFalsy(addAsFilter("hiddenTaxon")),
	id: ifIsTruthy(addAsFilter()),
	parents: ifIsTruthy(addAsFilter()),
	nonHiddenParents: ifIsTrue(addAsFilter())
};

const queryToElasticQuery = (query: Partial<TaxaBaseQuery>): ElasticQuery =>
	(Object.keys(query) as (keyof TaxaBaseQuery)[]).reduce((elasticQ: ElasticQuery, queryParam) => {
		const strategy = queryParamToEsQueryParam[queryParam];
		if (!strategy || query[queryParam] === undefined) {
			return elasticQ;
		}
		return strategy(query, queryParam, elasticQ);
	}, {
		 _source: { excludes: ["multimedia", "descriptions", "redListEvaluations", "latestRedListEvaluation"] },
		query: { bool: {} }
	});

const pageAdapter = ({ hits }: ElasticResponse, query: GetTaxaPageDto) =>
	paginateAlreadyPaginated({
		results: hits.hits.map(({ _source }) =>  mapPageItem(_source, query)),
		total: hits.total,
		pageSize: query.pageSize!,
		currentPage: query.page!
	});

const resultsAdapter = ({ hits }: ElasticResponse, query: GetTaxaPageDto) => ({
	results: hits.hits.map(({ _source }) =>  mapPageItem(_source, query))
});

const mapPageItem = (taxon: TaxonElastic, query: GetTaxaPageDto) =>
	query.includeHidden
		? { ...taxon, parents: taxon.nonHiddenParents }
		: taxon;
