import { Lang } from "./common.dto";
import { isObject } from "./type-utils";
import * as crypto from "crypto";

export const CACHE_1_SEC = 1000;
export const CACHE_1_MIN = CACHE_1_SEC * 60;

type PromiseReducer<T, R>  = {
	(value: T): R | Promise<R>;
}

type Reducer<T, R>  = {
	(value: T): R;
}

function isPromise<T>(p: any): p is Promise<T> {
	return !!p?.then;
}

/**
 * RXJS' `pipe` for plain promises.
 * Reduces an initial value into something else with a list of promises.
 *
 * @param initialValue The initial value that is passed to the 1st operation.
 * @param {...operations} operators which return the accumulated result which is passed to the next operation.
 *
 * @returns The accumulated result as a promise.
 */
/* eslint-disable max-len */
function promisePipe<T>(initialValue: T | Promise<T>): Promise<T>;
function promisePipe<T, A>(initialValue: T | Promise<T>, op1: PromiseReducer<T, A>): Promise<A>;
function promisePipe<T, A, B>(initialValue: T | Promise<T>, op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>): Promise<B>;
function promisePipe<T, A, B, C>(initialValue: T | Promise<T>, op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>): Promise<C>;
function promisePipe<T, A, B, C, D>(initialValue: T | Promise<T>, op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>, op4: PromiseReducer<C, D>): Promise<D>;
function promisePipe<T, A, B, C, D, E>(initialValue: T | Promise<T>, op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>, op4: PromiseReducer<C, D>, op5: PromiseReducer<D, E>): Promise<E>;
function promisePipe<T, A, B, C, D, E, F>(initialValue: T | Promise<T>, op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>, op4: PromiseReducer<C, D>, op5: PromiseReducer<D, E>, op6: PromiseReducer<E, F>): Promise<F>;
function promisePipe<T, A, B, C, D, E, F, G>(initialValue: T | Promise<T>, op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>, op4: PromiseReducer<C, D>, op5: PromiseReducer<D, E>, op6: PromiseReducer<E, F>, op7: PromiseReducer<F, G>): Promise<G>;
function promisePipe<T, A, B, C, D, E, F, G, H>(initialValue: T | Promise<T>, op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>, op4: PromiseReducer<C, D>, op5: PromiseReducer<D, E>, op6: PromiseReducer<E, F>, op7: PromiseReducer<F, G>, op8: PromiseReducer<G, H>): Promise<H>;
function promisePipe<T, A, B, C, D, E, F, G, H, I>(initialValue: T | Promise<T>, op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>, op4: PromiseReducer<C, D>, op5: PromiseReducer<D, E>, op6: PromiseReducer<E, F>, op7: PromiseReducer<F, G>, op8: PromiseReducer<G, H>, op9: PromiseReducer<H, I>): Promise<I>;
function promisePipe<T>(initialValue: T | Promise<T>, ...operations: PromiseReducer<any, any>[]): Promise<any> {
	return operations.reduce((promise, fn) => promise.then(
		value => isPromise(fn)
			? fn(value)
			: Promise.resolve(fn(value))
	)
	, isPromise(initialValue) ? initialValue : Promise.resolve(initialValue));
}

/**
 * Reduces an initial value into something else with a list of operations
 *
 * @param initialValue The initial value that is passed to the 1st operation.
 * @param {...operations} operators which return the accumulated result which is passed to the next operation.
 *
 * @returns The accumulated result as a promise.
 */
/* eslint-disable max-len */
function pipe<T>(initialValue: T): T;
function pipe<T, A>(initialValue: T, op1: Reducer<T, A>): A;
function pipe<T, A, B>(initialValue: T, op1: Reducer<T, A>, op2: Reducer<A, B>): B;
function pipe<T, A, B, C>(initialValue: T, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>): C;
function pipe<T, A, B, C, D>(initialValue: T, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>): D;
function pipe<T, A, B, C, D, E>(initialValue: T, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>): E;
function pipe<T, A, B, C, D, E, F>(initialValue: T, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>, op6: Reducer<E, F>): F;
function pipe<T, A, B, C, D, E, F, G>(initialValue: T, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>, op6: Reducer<E, F>, op7: Reducer<F, G>): G;
function pipe<T, A, B, C, D, E, F, G, H>(initialValue: T, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>, op6: Reducer<E, F>, op7: Reducer<F, G>, op8: Reducer<G, H>): H;
function pipe<T, A, B, C, D, E, F, G, H, I>(initialValue: T, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>, op6: Reducer<E, F>, op7: Reducer<F, G>, op8: Reducer<G, H>, op9: Reducer<H, I>): I;
function pipe<T>(initialValue: T, ...operations: Reducer<any, any>[]): any {
	return operations.reduce((value, fn) => fn(value), initialValue);
}


export { promisePipe, pipe };

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

export const paginateAlreadyPaged = <T>(pagedResult: Omit<PaginatedDto<T>, "@context" | "prevPage" | "nextPage">, lang = Lang.en) => pipe(
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
	const context = (paged.results[0] as any)?.["@context"]
	const results = context
		? paged.results.map(i => {
			const _i = { ...i };
			delete (_i as any)["@context"];
			return _i;
		}) : paged.results
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
}

type ApplyResult = {
	<T, R>(result: T, fn: (r: T) => R): Promise<R>
	<T, R>(result: T[], fn: (r: T) => R): Promise<R[]>
	<T, R>(result: PaginatedDto<T>, fn: (r: T) => R): Promise<PaginatedDto<R>>
	<T, R>(result: T | T[] | PaginatedDto<T>, fn: (r: T ) => R): Promise<R | R[] | PaginatedDto<R>>
}

/**
 * Map a given function to all items of a "result" - "result" being either a page, an array or a single object.
 */
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

export const uuid = (length: number) => crypto.randomBytes(length / 2).toString("hex");

export type CacheOptions = {
	/**
	 * milliseconds for the cache TTL, true for default TTL.
	 */
	cache?: number;
}
