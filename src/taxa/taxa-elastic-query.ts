import { JSONObjectSerializable, MaybeArray } from "src/typing.utils";
import { GetTaxaAggregateDto, GetTaxaPageDto, TaxaBaseQuery, TaxonElastic } from "./taxa.dto";
import { asArray, firstFromNonEmptyArr } from "src/utils";
import { HttpException } from "@nestjs/common";

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


export type ElasticResponse = {
	hits: { total: number,  hits: { _source: TaxonElastic }[] };
	aggregations: JSONObjectSerializable;
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
	taxon?: TaxonElastic
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
	query, queryParam, elasticQ, taxon
) => {
	if (typeof condition === "function" && condition(query[queryParam]) || query[queryParam] === condition) {
		return strategy(query, queryParam, elasticQ, taxon);
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

const addDepth: QueryParamStrategy = (query, _, elasticQ, taxon) => {
	const depthProp = query.includeHidden ? "depth" : "nonHiddenDepth";

	const { bool = { } } = elasticQ.query;
	elasticQ.query.bool = bool;
	bool.must = bool.must || [];
	bool.must.push({
		range: {
			[depthProp]: { gte: taxon![depthProp], lte: taxon![depthProp] + 1 }
		}
	});
	return elasticQ;
};

const addToBooleanQuery = (elasticQFilterParam?: string): QueryParamStrategy => (query, queryParam, elasticQ) => 
	Array.isArray(query[queryParam])
		? addToBooleanQueryMust(elasticQFilterParam)(query, queryParam, elasticQ)
		: addToBooleanQueryFilter(elasticQFilterParam)(query, queryParam, elasticQ);

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
	checklist: ifIsTruthy(addToBooleanQuery("nameAccordingTo")),
	primaryHabitat: ifIsTruthy(addToBooleanQuery("primaryHabitat.habitat")),
	anyHabitat: ifIsTruthy(addToBooleanQuery("anyHabitatSearchStrings")),
	"latestRedListEvaluation.primaryHabitat":
		ifIsTruthy(addToBooleanQuery("latestRedListEvaluation.primaryHabitatSearchStrings")),
	"latestRedListEvaluation.anyHabitat":
		ifIsTruthy(addToBooleanQuery("latestRedListEvaluation.anyHabitatSearchStrings")),
	selectedFields: ifIsTruthy(mapAs("_source")),
	includeMedia: ifIsTruthy(removeFromExclude("multimedia")),
	includeRedListEvaluations: ifIsTruthy(
		removeFromExclude("redListEvaluations", "latestRedListEvaluation")
	),
	includeDescriptions: ifIsTruthy(removeFromExclude("descriptions")),
	includeHidden: ifIsFalsy(addToBooleanQuery("hiddenTaxon")),
	id: ifIsTruthy(addToBooleanQuery()),
	ids: (query, queryParam, elasticQ) => {
		elasticQ.query.ids = { values: (query[queryParam] as string[]) };
		return elasticQ;
	},
	parents: ifIsTruthy(addToBooleanQuery()),
	nonHiddenParents: ifIsTruthy(addToBooleanQuery()),
	nonHiddenParentsIncludeSelf: ifIsTruthy(addToBooleanQuery()),
	parentsIncludeSelf: ifIsTruthy(addToBooleanQuery()),
	depth: ifIsTruthy(addDepth),
	aggregateSize: bypass,
	lang: bypass,
	langFallback: bypass,
	checklistVersion: bypass,
	parentTaxonId: bypass,
};

export const queryToElasticQuery = (query: Partial<TaxaBaseQuery>, taxon?: TaxonElastic): ElasticQuery =>
	(Object.keys(query) as (keyof TaxaBaseQuery)[]).reduce((elasticQ: ElasticQuery, queryParam) => {
		const strategy = queryParamToEsQueryParam[queryParam];
		if (!strategy) {
			return elasticQ;
		}
		return strategy(query, queryParam, elasticQ, taxon);
	}, {
		 _source: { excludes: ["multimedia", "descriptions", "redListEvaluations", "latestRedListEvaluation"] },
		query: { }
	});

