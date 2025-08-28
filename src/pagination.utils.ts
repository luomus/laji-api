import { HasJsonLdContext } from "src/common.dto";
import { MaybePromise, isObject, omitForKeys } from "src/typing.utils";
import { pipe } from "src/utils";

export class PaginatedDto<T> {
	currentPage: number;
	pageSize: number;
	total: number;
	lastPage: number;
	prevPage?: number;
	nextPage?: number;
	results: T[];
	"@context": string;
}

export const isPaginatedDto = <T>(maybePaginated: unknown): maybePaginated is PaginatedDto<T> =>
	isObject(maybePaginated) && ["results", "currentPage", "pageSize", "total", "lastPage"]
		.every(k => k in maybePaginated);

export const paginateArray = <T extends Partial<HasJsonLdContext> | Record<string, unknown>>(
	data: T[], page = 1, pageSize = 20
): PaginatedDto<Omit<T, "@context">> => {
	if (page <= 0) {
		page = 1;
	}

	console.log(data);
	const total = data.length;
	const  result = {
		total,
		results: data.slice((page - 1) * pageSize, page * pageSize),
		currentPage: page,
		pageSize
	};
	return paginateAlreadyPaginated(result);
};

export const paginateAlreadyPaginated = <T extends Partial<HasJsonLdContext> | Record<string, unknown>>(
	pagedResult: Omit<PaginatedDto<T>, "@context" | "lastPage" | "prevPage" | "nexPage">
): PaginatedDto<Omit<T, "@context">> => pipe(
		addLastPrevAndNextPage,
		addContextToPageLikeResult<T, PaginatedDto<T>>
	)(pagedResult);

type HasLastAndMaybePrevNext = { lastPage: number;  prevPage?: number; nextPage?: number; }

export const addLastPrevAndNextPage = <
	T,
	R extends { results: T[], currentPage: number; pageSize: number; total: number; }
>(pagedResult: R): R & HasLastAndMaybePrevNext => {
	const result: R & { lastPage: number; prevPage?: number; nextPage?: number; } = {
		...pagedResult,
		lastPage: pagedResult.pageSize === 0
			? 1
			: Math.max(Math.ceil(pagedResult.total / pagedResult.pageSize), 1)
	};
	if (result.currentPage > 1) {
		result.prevPage = result.currentPage - 1;
	}
	if (result.lastPage > result.currentPage) {
		result.nextPage = result.currentPage + 1;
	}
	return result;
};

export const addContextToPageLikeResult = <T extends Partial<HasJsonLdContext>, R extends { results: T[] }>
	(hasResults: R) : Omit<R, "results"> & { results: Omit<T, "@context">[] } & HasJsonLdContext => {
	const jsonLdContext = hasResults.results[0]?.["@context"];
	const results = jsonLdContext
		? hasResults.results.map(omitForKeys("@context"))
		: hasResults.results;
	return {
		...hasResults,
		results,
		"@context": jsonLdContext || "http://schema.laji.fi/context/generic.jsonld"
	};
};

export const isPageLikeResult = <T>(maybeHasResults: any): maybeHasResults is { results: T[] } =>
	isObject(maybeHasResults) && "results" in maybeHasResults;

export const getAllFromPagedResource = async <T>(
	getPage: (page: number) => Promise<PaginatedDto<T>>
): Promise<T[]> => {
	let res = await getPage(1);
	let items = res.results;
	while (res.currentPage < res.lastPage) {
		res = await getPage(res.currentPage + 1);
		items = items.concat(res.results);
	}
	return items;
};

/**
 * Creates a function that maps the input items of a "result" with the given predicate.
 * The "result" is either a page (or page-like, meaning that it has { "results": any }), an array or a single object.
 * */
function applyToResult<T, R>(predicate: (r: T) => MaybePromise<R>)
	: ((result: T) => Promise<R>)
function applyToResult<T, R>(predicate: (r: T) => MaybePromise<R>)
	: ((result: T[]) => Promise<R[]>)
function applyToResult<T, R>(predicate: (r: T) => MaybePromise<R>)
	: ((result: PaginatedDto<T>) => Promise<PaginatedDto<R>>)
function applyToResult<T, R>(predicate: (r: T) => MaybePromise<R>)
	: ((result: T | T[] | PaginatedDto<T>) => Promise<R | R[] | PaginatedDto<R>>)
{
	return async (result: T | T[] | PaginatedDto<T>): Promise<R | R[] | PaginatedDto<R>> => {
		if (isPageLikeResult(result)) {
			const mappedResults: R[] = [];
			for (const r of result.results) {
				mappedResults.push(await predicate(r));
			}
			return { ...result, results: mappedResults };
		} else if (Array.isArray(result)) {
			const mapped: R[] = [];
			for (const r of result) {
				mapped.push(await predicate(r));
			}
			return mapped;
		}
		return predicate(result);
	};
}

export { applyToResult };
