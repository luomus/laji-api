import { JSONObjectSerializable, MaybeArray } from "src/typing.utils";
import { AllQueryParams, GetTaxaAggregateDto, GetTaxaPageDto, SimpleFilters, TaxonElastic } from "./taxa.dto";
import { firstFromNonEmptyArr, pipe } from "src/utils";
import { HttpException } from "@nestjs/common";
import { JSONSchemaObject } from "src/json-schema.utils";

type ElasticQuery = {
	from?: number;
	pageSize?: number;
	size?: number;
	parents?: string;
	sort?: Record<string, { order: "asc" | "desc" }>[];
	aggs?: JSONObjectSerializable;
	id?: string;
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

export type TaxaFilters = Record<string, MaybeArray<string> | boolean>;

export type ElasticResponse = {
	hits: { total: number,  hits: { _source: TaxonElastic }[] };
	aggregations: JSONObjectSerializable;
};

type ElasticQueryBoolNode = { terms: Record<string, MaybeArray<string | number | boolean>> }
	| { term: Record<string, string | number | boolean> }
	| { range: Record<string,  { gte: number, lte: number }> };

type AggregateNode = Record<string, { terms: { field: string, size: number }, aggs?: AggregateNode }>;

type QueryParamStrategy<T extends ElasticQuery = ElasticQuery> = (
	query: Partial<AllQueryParams>,
	queryParam: keyof AllQueryParams,
	elasticQ: T,
	taxon?: TaxonElastic
) => T;

export const buildElasticQuery = (
	query: Partial<AllQueryParams>,
	filters?: TaxaFilters,
	filtersSchema?: JSONSchemaObject,
	taxon?: TaxonElastic
): ElasticQuery => {
	return pipe(
		queryToElasticQuery(query, taxon),
		applyFiltersToElasticQuery(withSimpleFiltersFromQuery(query, filters), filtersSchema!)
	)({
		_source: { excludes: ["multimedia", "descriptions", "redListEvaluations", "latestRedListEvaluation"] },
		query: { }
	});
};

const queryToElasticQuery = (query: Partial<AllQueryParams>, taxon?: TaxonElastic) => (elasticQuery: ElasticQuery) =>
	(Object.keys(query) as (keyof AllQueryParams)[]).reduce((elasticQ: ElasticQuery, queryParam) => {
		const strategy = queryParamToEsQueryParam[queryParam];
		if (!strategy || query[queryParam] === undefined) {
			return elasticQ;
		}
		return strategy(query, queryParam, elasticQ, taxon);
	}, elasticQuery);

/** Map to given **elasticQParam with** the given strategy */
const mapToElasticParamAs = <T extends ElasticQuery, K extends keyof T>(
	elasticQParam: K
) => (
		injectionalStrategy: (query: Partial<AllQueryParams>, queryParam: keyof AllQueryParams) => T[K]
	): QueryParamStrategy<T> => (
		query, queryParam, elasticQ
	) => {
		elasticQ[elasticQParam] = injectionalStrategy(query, queryParam);
		return elasticQ;
	};

const mapAs = (elasticQParam: keyof ElasticQuery) =>
	mapToElasticParamAs(elasticQParam)((query, queryParam) => query[queryParam] as any);

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

const mapAggregates = ({ aggregateBy, aggregateSize }: GetTaxaAggregateDto) =>
	aggregateBy.reduce((aggs, aggsString) => {
		const aggsFields = firstFromNonEmptyArr(aggsString.split("=")).split(",");
		return mapAggs(aggs, aggsFields, aggregateSize) as AggregateNode;
	}, {} as AggregateNode);

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

/**
 * The mapping between the incoming query and the elastic query.
 *
 * The keys are the incoming query params, and the values are strategies for how to map the query arguments into an elastic query.
 */
const queryParamToEsQueryParam: Partial<Record<keyof AllQueryParams, QueryParamStrategy>> = {
	aggregateBy: mapToElasticParamAs("aggs")(mapAggregates),
	page: mapToElasticParamAs("from")(({ page, pageSize }) => pageSize! * (page! - 1)),
	pageSize: mapAs("size"),
	sortOrder: mapToElasticParamAs("sort")(mapSortOrder),
	selectedFields: mapAs("_source"),
	includeMedia: removeFromExclude("multimedia"),
	includeRedListEvaluations: removeFromExclude("redListEvaluations", "latestRedListEvaluation"),
	includeDescriptions: removeFromExclude("descriptions"),
	depth: addDepth,
};

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

const applyFiltersToElasticQuery = (filters: TaxaFilters = {}, filtersSchema: JSONSchemaObject) =>
	(elasticQuery: ElasticQuery) => {
		for (const param of Object.keys(filters)) {
			if (!filtersSchema.properties![param]) {
				throw new HttpException(`Unknown filter '${param}'`, 422);
			}
			let arg = filters![param];
			if (typeof arg === "boolean") {
				addToBooleanQueryFilter(param, arg, elasticQuery);
				continue;
			}
			if (typeof arg === "string") {
				arg = [arg];
			}
			if (Array.isArray(arg) && typeof arg[0] === "string") {
				const inclusions: string[] = [];
				const exclusions: string[] = [];
				arg.forEach(subArg => (subArg[0] === "!" ? exclusions : inclusions).push(subArg));
				inclusions.length && addToBooleanQueryMust(param, arg, elasticQuery);
				exclusions.length && addToBooleanQueryMustNot(param, arg, elasticQuery);
				continue;
			}
			// eslint-disable-next-line max-len
			throw new HttpException(`Unrecognized filter '${param}'. Should be a boolean, a string or an array of string`, 422);
		}
		return elasticQuery;
	};

const withSimpleFiltersFromQuery = (
	query: Partial<AllQueryParams>,
	filters?: TaxaFilters
) => {
	if (query.includeHidden === false)  {
		filters = { ...(filters || {}), hiddenTaxon: false };
	}
	(["invasiveSpecies", "informalTaxonGroups", "finnish", "id"] as (keyof SimpleFilters)[]).forEach(filter => {
		if (filter in query) {
			filters = { ...(filters || {}), [filter]: query[filter]! };
		}
	});
	if (query.checklist)  {
		filters = { ...(filters || {}), nameAccordingTo: query.checklist };
	}
	return filters;
};

const addToBooleanQueryFilter = (param: string, arg: boolean, elasticQ: ElasticQuery) => {
	const { bool = {} } = elasticQ.query;
	elasticQ.query.bool = bool;
	bool.filter = bool.filter || [];
	bool.filter!.push({ term: { [param]: arg } });
	return elasticQ;
};

const addToBooleanQueryMust = (param: string, arg: string[], elasticQ: ElasticQuery) => {
	const { bool = {} } = elasticQ.query;
	elasticQ.query.bool = bool;
	bool.must = bool.must || [];
	bool.must!.push({ terms: { [param]: arg } });
	return elasticQ;
};

const addToBooleanQueryMustNot = (param: string, arg: string[], elasticQ: ElasticQuery) => {
	const { bool = {} } = elasticQ.query;
	elasticQ.query.bool = bool;
	bool.must_not = bool.must_not || [];
	bool.must_not!.push({ terms: { [param]: arg } });
	return elasticQ;
};

