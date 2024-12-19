import * as crypto from "crypto";
import { MaybePromise, isObject } from "./typing.utils";

export const CACHE_1_SEC = 1000;
export const CACHE_1_MIN = CACHE_1_SEC * 60;
export const CACHE_5_MIN = 1000 * 60 * 5;
export const CACHE_10_MIN = CACHE_1_MIN * 10;
export const CACHE_30_MIN = CACHE_1_MIN * 30;
export const CACHE_1_H = CACHE_1_MIN * 60;

export type CacheOptions = {
	/** Milliseconds for the cache TTL, true for default TTL. */
	cache?: number | true;
}

export const getCacheTTL = (cache: CacheOptions["cache"] | { ttl?: number }): undefined | number =>
	isObject(cache)
		? cache.ttl ?? undefined
		: typeof cache === "number"
			? cache
			: undefined;

type Reducer<T, R> = {
	(value: T): R;
}

type Pipe<I, O> = (input: I) => O;

/* eslint-enable max-len */

/**
 * Creates a function that reduces given input with the given operators.
 *
 * @param {...operations} operators which return the accumulated result which is passed to the next operation.
 *
 * @returns function that is run for the operators for an input.
 */
/* eslint-disable max-len */
function pipe<T>(): Pipe<T, T>;
function pipe<T, A>(op1: Reducer<T, A>): Pipe<T, A>;
function pipe<T, A, B>(op1: Reducer<T, A>, op2: Reducer<A, B>): Pipe<T, B>;
function pipe<T, A, B, C>(op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>): Pipe<T, C>;
function pipe<T, A, B, C, D>(op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>): Pipe<T, D>;
function pipe<T, A, B, C, D, E>(op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>): Pipe<T, E>;
function pipe<T, A, B, C, D, E, F>(op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>, op6: Reducer<E, F>): Pipe<T, F>;
function pipe<T, A, B, C, D, E, F, G>(op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>, op6: Reducer<E, F>, op7: Reducer<F, G>): Pipe<T, G>;
function pipe<T, A, B, C, D, E, F, G, H>(op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>, op6: Reducer<E, F>, op7: Reducer<F, G>, op8: Reducer<G, H>): Pipe<T, H>;
function pipe<T, A, B, C, D, E, F, G, H, I>(op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>, op6: Reducer<E, F>, op7: Reducer<F, G>, op8: Reducer<G, H>, op9: Reducer<H, I>): Pipe<T, I>;
function pipe<T>(...operations: Reducer<any, any>[]): Pipe<T, any> {
	return (initialValue: T) =>
		operations.reduce((value, fn) => fn(value), initialValue);
}
/* eslint-enable max-len */

type PromisePipe<I, O> = Pipe<MaybePromise<I>, Promise<O>>;

type PromiseReducer<T, R>  = {
	(value: T): R | Promise<R>;
}

/**
 * RXJS' `pipe` for plain promises.
 * Creates a function that reduces given input with the given operators.
 *
 * @param {...operations} operators which return the accumulated result which is passed to the next operation.
 *
 * @returns function that is run for the operators for an input.
 */
/* eslint-disable max-len */
function promisePipe<T>(): PromisePipe<T, T>;
function promisePipe<T, A>(op1: PromiseReducer<T, A>): PromisePipe<T, A>;
function promisePipe<T, A, B>(op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>): PromisePipe<T, B>;
function promisePipe<T, A, B, C>(op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>): PromisePipe<T, C>;
function promisePipe<T, A, B, C, D>(op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>, op4: PromiseReducer<C, D>): PromisePipe<T, D>;
function promisePipe<T, A, B, C, D, E>(op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>, op4: PromiseReducer<C, D>, op5: PromiseReducer<D, E>): PromisePipe<T, E>;
function promisePipe<T, A, B, C, D, E, F>(op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>, op4: PromiseReducer<C, D>, op5: PromiseReducer<D, E>, op6: PromiseReducer<E, F>): PromisePipe<T, F>;
function promisePipe<T, A, B, C, D, E, F, G>(op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>, op4: PromiseReducer<C, D>, op5: PromiseReducer<D, E>, op6: PromiseReducer<E, F>, op7: PromiseReducer<F, G>): PromisePipe<T, G>;
function promisePipe<T, A, B, C, D, E, F, G, H>(op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>, op4: PromiseReducer<C, D>, op5: PromiseReducer<D, E>, op6: PromiseReducer<E, F>, op7: PromiseReducer<F, G>, op8: PromiseReducer<G, H>): PromisePipe<T, H>;
function promisePipe<T, A, B, C, D, E, F, G, H, I>(op1: PromiseReducer<T, A>, op2: PromiseReducer<A, B>, op3: PromiseReducer<B, C>, op4: PromiseReducer<C, D>, op5: PromiseReducer<D, E>, op6: PromiseReducer<E, F>, op7: PromiseReducer<F, G>, op8: PromiseReducer<G, H>, op9: PromiseReducer<H, I>): PromisePipe<T, I>;
function promisePipe<T>(...operations: PromiseReducer<any, any>[]): PromisePipe<T, any>;
function promisePipe<T>(...operations: PromiseReducer<any, any>[]): PromisePipe<T, any> {
	return (initialValue: T) => (async () => {
		let value = await initialValue;
		for (const fn of operations) {
			value = await fn(value);
		}
		return value;
	})();
}

export { promisePipe, pipe };

export const uuid = (length: number) => crypto.randomBytes(length / 2).toString("hex");

export const dictionarify = <T extends string>(arr: readonly T[]): Record<T, true> =>
	arr.reduce((dict, item) => {
		dict[item] = true;
		return dict;
	}, {} as Record<T, true>);

export const dictionarifyByKey = <T>(objects: T[], key: keyof T) =>
	objects.reduce<Record<string, T>>((map, obj) => {
		map[obj[key] as string] = obj;
		return map;
	}, {});

/** Removes keys not in the whitelist from given object. Note that it performs this mutably for performance reasons! */
export const whitelistKeys = <T extends Record<string, unknown>>(obj: T, whitelist: Readonly<(keyof T)[]>) => {
	const knownKeys = dictionarify(Object.getOwnPropertyNames(obj));
	whitelist && Object.keys(knownKeys).forEach(prop => {
		if (!whitelist.includes(prop)) {
			delete (obj as any)[prop];
		}
	});
	return obj;
};

type ParseJSONPointerOptions = {
	/** If a property is undefined and the pointer isn't yet parsed fully, undefined is returned. */
	safely?: boolean;
	/**
	 * If a property is undefined and the pointer isn't yet parsed fully, the missing properties will be created. This is
	 * a mutable operation. It adds an array if the token is numeric, and an object for a non-numeric token
	 * **/
	create?: boolean;
}

const validateJSONPointer = (pointer: string) => {
	if (pointer[0] !== "/") {
		throw new Error("Invalid JSON pointer");
	}
};

const parseJSONPointerToken = (token: string) => token.replace(/~1/g, "/").replace(/~0/g, "~");

export const parseJSONPointer = <T = unknown>(
	obj: object,
	pointer: string,
	{ safely, create }: ParseJSONPointerOptions = {}
) : T => {
	if (pointer === "") {
		return obj as T;
	}
	validateJSONPointer(pointer);
	const splits = pointer.split("/");
	splits.shift();
	return splits.reduce((pointedObj, token, i) => {
		token = parseJSONPointerToken(token);
		if ((create || safely) && (!pointedObj || !(token in pointedObj))) {
			if (create) {
				const nextSplit = splits[i + 1]!;
				(pointedObj as any)[token] = isNaN(+nextSplit) ? {} : [];
			} else if (safely) {
				return undefined;
			}
		}
		return (pointedObj as any)[token] as unknown;
	}, obj) as T;
};

/** Warning: updates target immutably */
export const updateWithJSONPointer = (
	obj: object,
	pointer: string,
	value: unknown,
	options?: ParseJSONPointerOptions
): void => {
	validateJSONPointer(pointer);
	const splits = pointer.split("/");
	splits.shift();
	const lastToken = parseJSONPointerToken(splits.pop() as string);
	const lastContainerPointer = splits.length ? `/${splits.join("/")}` : undefined;

	const lastContainer = parseJSONPointer(obj, lastContainerPointer ?? "", options);
	if (options?.safely && !lastContainer) {
		return;
	}
	(lastContainer as any)[lastToken] = value;
};

const validateURIFragmentIdentifierRepresentation = (pointer: string) => {
	if (pointer[0] !== "#") {
		throw new Error("Invalid URI fragment identifier representation");
	}
};

export const parseURIFragmentIdentifierRepresentation = <T = unknown>(
	obj: object,
	pointer: string,
	options?: ParseJSONPointerOptions
): T => {
	validateURIFragmentIdentifierRepresentation(pointer);
	return parseJSONPointer(obj, pointer.substr(1), options);
};

export const asArray = <T>(maybeArr: T | T[]): T[] =>
	Array.isArray(maybeArr) ? maybeArr : [maybeArr];

/** Returns a function that applies the given predicate to the input, if it's not undefined. */
export const doForDefined = <T, R>(predicate: (p: T) => R) => (maybe?: T) => maybe ? predicate(maybe) : undefined;

// TODO check for invalid date after documents branch merge
export const dateToISODate = (date: Date): string => date.toISOString().split("T")[0] as string;

// TS is wrong here, `Date.parse()` accepts `Date`.
export const isValidDate = (date?: Date) => !isNaN(Date.parse(date as unknown as string));

/** @throws Error if array is empty */
export const lastFromNonEmptyArr = <T>(arr: T[]): T => {
	if (arr.length === 0) {
		throw new Error("Array was empty");
	}
	return arr[arr.length - 1]!;
};

/** @throws Error if array is empty */
export const firstFromNonEmptyArr = <T>(arr: T[]): T => {
	if (arr.length === 0) {
		throw new Error("Array was empty");
	}
	return arr[0]!;
};

export const dotNotationToJSONPointer = (pointer: string) => {
	if (pointer === "") {
		return "";
	}
	const splits = pointer.split(/[.\[\]]/).filter(value => value !== "");
	return "/" + splits.join("/");
};

export const isJSONPointer = (pointer: string) =>
	pointer === "" || pointer[0] === "/";

/** Filters non strings (or numbers) out and joins with " " */
export const joinOnlyStrings = (...array: (unknown)[]) => {
	return array.filter(m => typeof m === "string" || typeof m === "number").join(" ");
};
