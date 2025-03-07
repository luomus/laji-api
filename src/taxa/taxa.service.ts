import { HttpException, Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ChecklistVersion, GetSpeciesAggregateDto, GetSpeciesPageDto, GetTaxaAggregateDto, GetTaxaChildrenDto, GetTaxaDescriptionsDto, GetTaxaPageDto, GetTaxaParentsDto, GetTaxonDto, TaxaBaseQuery, Taxon, TaxonElastic }
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
		console.log(JSON.stringify(query, undefined, 2));
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
		if (query.id) {
			query[query.includeHidden ? "parentsIncludeSelf" : "nonHiddenParentsIncludeSelf"] = query.id;
		}

		return pageAdapter(await this.search(query), query);
	}

	async getAggregate(query: GetTaxaAggregateDto) {
		return mapResponseAggregations((await this.search(query)).aggregations, query.aggregateBy);
	}

	async getSpeciesPage(query: GetSpeciesPageDto) {
		console.log('get species page', query);
		return this.getPage({ ...query, species: true });
	}

	async getSpeciesAggregate(query: GetSpeciesAggregateDto) {
		return mapResponseAggregations(
			(await this.search({ ...query, species: true })).aggregations,
			query.aggregateBy
		);
	}

	async getBySubject(id: string, query: GetTaxonDto = {}) {
		const [taxon] =  (await this.search({
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

		const elasticQuery = queryToElasticQuery(childrenQuery);

		if (!elasticQuery.query.bool) {
			elasticQuery.query.bool = {};
		}

		const { bool = {} } = elasticQuery.query;
		elasticQuery.query.bool = bool;
		bool.must = bool.must || [];
		bool.must.push({
			...(elasticQuery.query.bool.must || {}),
			range: {
				[depthProp]: { gte: taxon[depthProp], lte: taxon[depthProp] + 1 }
			}
		});

		return arrayAdapter(
			await this.elasticSearch(elasticQuery, childrenQuery.checklistVersion!),
			query
		);
		// Waiting for https://github.com/luomus/laji-api/issues/57, needs front end migration
		// return resultsAdapter(
		// 	await this.elasticSearch(elasticQuery, childrenQuery.checklistVersion!),
		// 	query
		// );
	}

	async getTaxonParents(id: string, query: GetTaxaParentsDto) {
		const taxon = await this.getBySubject(id, { selectedFields: ["nonHiddenParents"] });
		const parents = await this.search({
			ids: taxon.nonHiddenParents,
			checklistVersion: ChecklistVersion.current,
			sortOrder: "taxonomic",
			pageSize: 10000,
			...query
		});
		return arrayAdapter(parents, query);
		// Waiting for https://github.com/luomus/laji-api/issues/57, needs front end migration
		// return resultsAdapter(
		// 	await this.elasticSearch(elasticQuery, childrenQuery.checklistVersion!),
		// 	query
		// );
	}

	async getTaxonSpeciesPage(id: string, query: GetTaxaPageDto) {
		return this.getPage({ ...query, species: true, id });
	}

	async getTaxonSpeciesAggregate(id: string, query: GetTaxaAggregateDto) {
		return this.getAggregate({ ...query, species: true, id });
	}


	async getTaxonDescriptions(id: string, query: GetTaxaDescriptionsDto) {
		return (await this.getBySubject(id, { ...query, selectedFields: ["descriptions"] })).descriptions;
	}

	async getTaxonMedia(id: string, query: GetTaxaDescriptionsDto) {
		return (await this.getBySubject(id, { ...query, selectedFields: ["multimedia"] })).multimedia;
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
		bool?: {
			filter?: ElasticQueryBoolNode[];
			must_not?: ElasticQueryBoolNode[];
			must?: ElasticQueryBoolNode[];
		},
		ids?: { values: string[] }
	};
	_source: { excludes: string[] } | string[];
};

type ElasticQueryBoolNode = { terms: Record<string, MaybeArray<string | number | boolean>> }
	| { term: Record<string, string | number | boolean> }
	| { range: Record<string,  { gte: number, lte: number }> };

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

const ifIsTruthy = ifIs((arg: unknown) => !!arg);
const ifIsFalsy = ifIs((arg: unknown) => !arg);

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

/** @param elasticQueryParam The elastic query filter param. Defaults to the input query param */
const addToBooleanQueryFilter = (elasticQFilterParam?: string): QueryParamStrategy => (query, queryParam, elasticQ) => {
	const { bool = {} } = elasticQ.query;
	elasticQ.query.bool = bool;
	bool.filter = bool.filter || [];
	asArray(query[queryParam]!).forEach(queryArg => {
		bool.filter!.push({ term: { [elasticQFilterParam ?? queryParam]: queryArg } });
	});
	return elasticQ;
};

/** @param elasticQueryParam The elastic query filter param. Defaults to the input query param */
const addToBooleanQueryMust = (elasticQFilterParam?: string): QueryParamStrategy => (query, queryParam, elasticQ) => {
	const { bool = {} } = elasticQ.query;
	elasticQ.query.bool = bool;
	bool.must = bool.must || [];
	bool.must!.push({ terms: { [elasticQFilterParam ?? queryParam]: query[queryParam]! } });
	return elasticQ;
};

const addToBooleanQueryMustNot = (elasticQFilterParam?: string): QueryParamStrategy =>
	(query, queryParam, elasticQ) => {

		const { bool = { } } = elasticQ.query;
		elasticQ.query.bool = bool;
		bool.must_not = bool.must_not || [];
		const arg = query[queryParam] as (string | boolean | number)[];
		bool.must_not.push({ terms: { [elasticQFilterParam ?? queryParam]: arg } });
		return elasticQ;
	};

const addToBooleanQuery = (elasticQFilterParam?: string): QueryParamStrategy => (query, queryParam, elasticQ) => {
	const arg = query[queryParam];
	return Array.isArray(arg)
		? addToBooleanQueryMust(elasticQFilterParam)(query, queryParam, elasticQ)
		: addToBooleanQueryFilter(elasticQFilterParam)(query, queryParam, elasticQ);
};

const bypass: QueryParamStrategy = (_, __, elasticQ) => elasticQ;

/**
 * The mapping between the incoming query and the elastic query.
 *
 * The keys are the incoming query params, and the values are strategies for how to map the query arguments into an elastic query.
 */
const queryParamToEsQueryParam: Record<keyof TaxaBaseQuery, QueryParamStrategy> = {
	aggregateBy: mapToElasticParamAs("aggs")(mapAggregates),
	page: mapToElasticParamAs("from")(({ page, pageSize }) => pageSize! * (page! - 1)),
	pageSize: mapAs("size"),
	sortOrder: mapToElasticParamAs("sort")(mapSortOrder),
	species: ifIsTruthy(addToBooleanQuery()),
	redListEvaluationGroups: ifIsTruthy(addToBooleanQuery()),
	invasiveSpeciesMainGroups: ifIsTruthy(addToBooleanQuery()),
	"latestRedListEvaluation.threatenedAtArea": ifIsTruthy(addToBooleanQuery()),
	"latestRedListEvaluation.redListStatus": ifIsTruthy(addToBooleanQuery()),
	"latestRedListEvaluation.primaryThreat": ifIsTruthy(addToBooleanQuery()),
	"latestRedListEvaluation.threats": ifIsTruthy(addToBooleanQuery()),
	"latestRedListEvaluation.primaryEndangermentReason": ifIsTruthy(addToBooleanQuery()),
	hasLatestRedListEvaluation: ifIsTruthy(addToBooleanQuery()),
	"latestRedListEvaluation.endangermentReasons": ifIsTruthy(addToBooleanQuery()),
	taxonSets: ifIsTruthy(addToBooleanQuery()),
	onlyFinnish: ifIsTruthy(addToBooleanQuery("finnish")),
	invasiveSpeciesFilter: ifIsTruthy(addToBooleanQuery("invasiveSpecies")),
	informalGroupFilters: ifIsTruthy(addToBooleanQuery("informalTaxonGroups")),
	typesOfOccurrenceFilters: ifIsTruthy(addToBooleanQuery("typeOfOccurrenceInFinland")),
	typesOfOccurrenceNotFilters: addToBooleanQueryMustNot(),
	adminStatusFilters: ifIsTruthy(addToBooleanQuery("administrativeStatuses")),
	redListStatusFilters: ifIsTruthy(addToBooleanQuery("latestRedListStatusFinland.status")),
	taxonRanks: ifIsTruthy(addToBooleanQuery("taxonRank")),
	hasMediaFilter: ifIsTruthy(addToBooleanQuery("hasMultimedia")),
	hasDescriptionFilter: ifIsTruthy(addToBooleanQuery("hasDescriptions")),
	hasBoldData: ifIsTruthy(addToBooleanQuery("hasBold")),
	checklist: addToBooleanQuery("nameAccordingTo"),
	primaryHabitat: ifIsTruthy(addToBooleanQuery("primaryHabitat.habitat")),
	anyHabitat: ifIsTruthy(addToBooleanQuery("anyHabitatSearchStrings")),
	"latestRedListEvaluation.primaryHabitat":
		ifIsTruthy(addToBooleanQuery("latestRedListEvaluation.primaryHabitatSearchStrings")),
	"latestRedListEvaluation.anyHabitat":
	ifIsTruthy(addToBooleanQuery("latestRedListEvaluation.anyHabitatSearchStrings")),
	selectedFields: mapAs("_source"),
	includeMedia: ifIsTruthy(removeFromExclude("multimedia")),
	includeRedListEvaluations: ifIsTruthy(
		removeFromExclude("redListEvaluations", "latestRedListEvaluation")
	),
	includeDescriptions: ifIsTruthy(removeFromExclude("descriptions")),
	includeHidden: ifIsFalsy(addToBooleanQuery("hiddenTaxon")),
	id: ifIsTruthy(addToBooleanQuery()),
	parents: ifIsTruthy(addToBooleanQuery()),
	nonHiddenParents: ifIsTruthy(addToBooleanQuery()),
	nonHiddenParentsIncludeSelf: ifIsTruthy(addToBooleanQuery()),
	parentsIncludeSelf: addToBooleanQuery(),
	ids: ifIsTruthy((query, queryParam, elasticQ) => {
		elasticQ.query.ids = { values: (query[queryParam] as string[]) };
		return elasticQ;
	}),
	aggregateSize: bypass,
	lang: bypass,
	langFallback: bypass,
	checklistVersion: bypass,
	parentTaxonId: bypass
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
		query: { }
	});

const pageAdapter = ({ hits }: ElasticResponse, query: GetTaxaPageDto) =>
	paginateAlreadyPaginated({
		results: hits.hits.map(({ _source }) =>  mapPageItem(_source, query)),
		total: hits.total,
		pageSize: query.pageSize!,
		currentPage: query.page!
	});

// const resultsAdapter = ({ hits }: ElasticResponse, query: GetTaxaPageDto) => ({
// 	results: hits.hits.map(({ _source }) =>  mapPageItem(_source, query))
// });

const arrayAdapter = ({ hits }: ElasticResponse, query: Partial<TaxaBaseQuery>) => 
	hits.hits.map(({ _source }) =>  mapPageItem(_source, query));

const mapPageItem = (taxon: TaxonElastic, query: Partial<TaxaBaseQuery>) =>
	query.includeHidden
		? { ...taxon, parents: taxon.nonHiddenParents }
		: taxon;
