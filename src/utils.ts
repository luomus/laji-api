import * as crypto from "crypto";

export const CACHE_1_SEC = 1000;
export const CACHE_1_MIN = CACHE_1_SEC * 60;
export const CACHE_10_MIN = CACHE_1_MIN * 10;
export const CACHE_30_MIN = CACHE_1_MIN * 30;
export const CACHE_1_H = CACHE_1_MIN * 60;

export type CacheOptions = {
	/** Milliseconds for the cache TTL, true for default TTL. */
	cache?: number | true;
}

type PromiseReducer<T, R>  = {
	(value: T): R | Promise<R>;
}

type Reducer<T, R> = {
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
/* eslint-enable max-len */

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
/* eslint-enable max-len */

export { promisePipe, pipe };

export const uuid = (length: number) => crypto.randomBytes(length / 2).toString("hex");

export const dictionarify = (arr: string[]) =>
	arr.reduce<Record<string, boolean>>((dict, item) => {
		dict[item] = true;
		return dict;
	}, {});

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
	const last = splits.pop() as string;
	const lastContainerPointer = splits.length ? `/${splits.join("/")}` : undefined;

	const lastContainer = parseJSONPointer(obj, lastContainerPointer ?? "", options);
	if (options?.safely && !lastContainer) {
		return;
	}
	(lastContainer as any)[last] = value;
	return;
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
