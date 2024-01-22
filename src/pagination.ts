import { Lang } from "./common.dto";
import { isObject } from "./type-utils";
import { pipe } from "./utils";

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

export const isPaginatedDto = <T>(maybePaginated: any): maybePaginated is PaginatedDto<T> => 
	isObject(maybePaginated) && ["results", "currentPage", "pageSize", "total", "lastPage"]
		.every(k => k in maybePaginated);

export const pageResult = <T>(data: T[], page = 1, pageSize = 20, lang = Lang.en): PaginatedDto<T> => {
	if (page <= 0) {
		page = 1;
	}

	const total = data.length;
	const lastPage = Math.ceil(total / pageSize);
	const  result: Omit<PaginatedDto<T>, "@context"> = {
		total,
		results: data.slice((page - 1) * pageSize, page * pageSize),
		currentPage: page,
		pageSize,
		lastPage
	};
	return paginateAlreadyPaged(result, lang);
};

export const paginateAlreadyPaged =
	<T>(pagedResult: Omit<PaginatedDto<T>, "@context" | "prevPage" | "nextPage">, lang = Lang.en) => pipe(
		pagedResult,
		addPrevAndNextPage,
		addContextToPaged(lang)
	);

export const addPrevAndNextPage = <T extends { currentPage: number; lastPage: number; }>(data: T)
	: T & { prevPage?: number; nextPage?: number; } => {
	const result: T & { prevPage?: number; nextPage?: number; } = { ...data };
	if (result.currentPage > 1) {
		result.prevPage = result.currentPage - 1;
	}
	if (result.lastPage > result.currentPage) {
		result.nextPage = result.currentPage + 1;
	}
	return result;
};

const addContextToPaged = <T>(lang = Lang.en) => (paged: Omit<PaginatedDto<T>, "@context">): PaginatedDto<T> => {
	const context = (paged.results[0] as any)?.["@context"];
	const results = context
		? paged.results.map(i => {
			const _i = { ...i };
			delete (_i as any)["@context"];
			return _i;
		}) : paged.results;
	return { ...paged, results, "@context": context || `http://schema.laji.fi/context/generic-${lang}.jsonld` };
};

export const getAllFromPagedResource = async <T>(
	getPage: (page: number) => Promise<Pick<PaginatedDto<T>, "results" | "lastPage" | "currentPage">>
): Promise<T[]> => {
	let res = await getPage(1);
	let items = res.results;
	while (res.currentPage < res.lastPage) {
		res = await getPage(res.currentPage + 1);
		items = items.concat(res.results);
	}
	return items;
};

type ApplyResult = {
	<T, R>(result: T, fn: (r: T) => R): Promise<R>
	<T, R>(result: T[], fn: (r: T) => R): Promise<R[]>
	<T, R>(result: PaginatedDto<T>, fn: (r: T) => R): Promise<PaginatedDto<R>>
	<T, R>(result: T | T[] | PaginatedDto<T>, fn: (r: T ) => R): Promise<R | R[] | PaginatedDto<R>>
}

/** Map a given function to all items of a "result". The "result" is either a page, an array or a single object. */
const applyToResult: ApplyResult =  async <T, R>(result: T | T[] | PaginatedDto<T>, fn: (r: T) => R)
	: Promise<R | R[] | PaginatedDto<R>> => {
	if (isPaginatedDto(result)) {
		const mappedResults = [];
		for (const r of result.results) {
			mappedResults.push(await fn(r));
		}
		return { ...result, results: mappedResults };
	} else if (Array.isArray(result)) {
		const mapped = [];
		for (const r of result) {
			mapped.push(await fn(r));
		}
		return mapped;
	}
	return fn(result);
};

export { applyToResult };
