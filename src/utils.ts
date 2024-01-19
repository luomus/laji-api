import * as crypto from "crypto";

export const CACHE_1_SEC = 1000;
export const CACHE_1_MIN = CACHE_1_SEC * 60;
export const CACHE_10_MIN = CACHE_1_MIN * 10;
export const CACHE_30_MIN = CACHE_1_MIN * 30;

export type CacheOptions = {
	/**milliseconds for the cache TTL, true for default TTL. */
	cache?: number;
}

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

export const uuid = (length: number) => crypto.randomBytes(length / 2).toString("hex");

export const dictionarify = (arr: string[]) =>
	arr.reduce<Record<string, boolean>>((dict, item) => {
		dict[item] = true;
		return dict;
	}, {});

/** Removes given keys from given object. Note that it performs this immutably for performance reasons! */
export const whitelistKeys = <T extends Record<string, unknown>>(obj: T, whitelist: (keyof T)[]) => {
	const knownKeys = dictionarify(Object.getOwnPropertyNames(obj));
	whitelist && Object.keys(knownKeys).forEach(prop => {
		if (!whitelist.includes(prop)) {
			delete (obj as any)[prop];
		}
	});
	return obj;
}

