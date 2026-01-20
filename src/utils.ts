import { HttpException } from "@nestjs/common";
import * as crypto from "crypto";
import { JSONObjectSerializable, MaybePromise, isObject } from "src/typing.utils";
import * as translations from "src/translations.json";

export const CACHE_1_SEC = 1000;
export const CACHE_1_MIN = CACHE_1_SEC * 60;
export const CACHE_5_MIN = 1000 * 60 * 5;
export const CACHE_10_MIN = CACHE_1_MIN * 10;
export const CACHE_30_MIN = CACHE_1_MIN * 30;
export const CACHE_1_H = CACHE_1_MIN * 60;
export const CACHE_1_D = CACHE_1_H * 24;

export type CacheOptions = {
	/** Milliseconds for the cache TTL, true for no TTL (does not expire). */
	cache?: number | true;
}

export const getCacheTTL = (cache: CacheOptions["cache"] | { ttl?: number }): undefined | number =>
	isObject(cache)
		? cache.ttl ?? undefined
		: typeof cache === "number"
			? cache
			: undefined;

type Op<T, R> = {
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
function pipe<T, A>(op1: Op<T, A>): Pipe<T, A>;
function pipe<T, A, B>(op1: Op<T, A>, op2: Op<A, B>): Pipe<T, B>;
function pipe<T, A, B, C>(op1: Op<T, A>, op2: Op<A, B>, op3: Op<B, C>): Pipe<T, C>;
function pipe<T, A, B, C, D>(op1: Op<T, A>, op2: Op<A, B>, op3: Op<B, C>, op4: Op<C, D>): Pipe<T, D>;
function pipe<T, A, B, C, D, E>(op1: Op<T, A>, op2: Op<A, B>, op3: Op<B, C>, op4: Op<C, D>, op5: Op<D, E>): Pipe<T, E>;
function pipe<T, A, B, C, D, E, F>(op1: Op<T, A>, op2: Op<A, B>, op3: Op<B, C>, op4: Op<C, D>, op5: Op<D, E>, op6: Op<E, F>): Pipe<T, F>;
function pipe<T, A, B, C, D, E, F, G>(op1: Op<T, A>, op2: Op<A, B>, op3: Op<B, C>, op4: Op<C, D>, op5: Op<D, E>, op6: Op<E, F>, op7: Op<F, G>): Pipe<T, G>;
function pipe<T, A, B, C, D, E, F, G, H>(op1: Op<T, A>, op2: Op<A, B>, op3: Op<B, C>, op4: Op<C, D>, op5: Op<D, E>, op6: Op<E, F>, op7: Op<F, G>, op8: Op<G, H>): Pipe<T, H>;
function pipe<T, A, B, C, D, E, F, G, H, I>(op1: Op<T, A>, op2: Op<A, B>, op3: Op<B, C>, op4: Op<C, D>, op5: Op<D, E>, op6: Op<E, F>, op7: Op<F, G>, op8: Op<G, H>, op9: Op<H, I>): Pipe<T, I>;
function pipe<T>(...operations: Op<any, any>[]): Pipe<T, any> {
	return (initialValue: T) =>
		operations.reduce((value, fn) => fn(value), initialValue);
}
/* eslint-enable max-len */

type PromisePipe<I, O> = Pipe<MaybePromise<I>, Promise<O>>;

type PromiseOp<T, R>  = {
	(value: T): R | Promise<R>;
}

/**
 * RXJS' `pipe` for plain promises.
 * Creates a function that reduces given input with the given operators.
 *
 * @param {...operations} operators which return the accumulated result which is passed to the next operation.
 * * @returns function that is run for the operators for an input.
 */
/* eslint-disable max-len */
function promisePipe<T>(): PromisePipe<T, T>;
function promisePipe<T, A>(op1: PromiseOp<T, A>): PromisePipe<T, A>;
function promisePipe<T, A, B>(op1: PromiseOp<T, A>, op2: PromiseOp<A, B>): PromisePipe<T, B>;
function promisePipe<T, A, B, C>(op1: PromiseOp<T, A>, op2: PromiseOp<A, B>, op3: PromiseOp<B, C>): PromisePipe<T, C>;
function promisePipe<T, A, B, C, D>(op1: PromiseOp<T, A>, op2: PromiseOp<A, B>, op3: PromiseOp<B, C>, op4: PromiseOp<C, D>): PromisePipe<T, D>;
function promisePipe<T, A, B, C, D, E>(op1: PromiseOp<T, A>, op2: PromiseOp<A, B>, op3: PromiseOp<B, C>, op4: PromiseOp<C, D>, op5: PromiseOp<D, E>): PromisePipe<T, E>;
function promisePipe<T, A, B, C, D, E, F>(op1: PromiseOp<T, A>, op2: PromiseOp<A, B>, op3: PromiseOp<B, C>, op4: PromiseOp<C, D>, op5: PromiseOp<D, E>, op6: PromiseOp<E, F>): PromisePipe<T, F>;
function promisePipe<T, A, B, C, D, E, F, G>(op1: PromiseOp<T, A>, op2: PromiseOp<A, B>, op3: PromiseOp<B, C>, op4: PromiseOp<C, D>, op5: PromiseOp<D, E>, op6: PromiseOp<E, F>, op7: PromiseOp<F, G>): PromisePipe<T, G>;
function promisePipe<T, A, B, C, D, E, F, G, H>(op1: PromiseOp<T, A>, op2: PromiseOp<A, B>, op3: PromiseOp<B, C>, op4: PromiseOp<C, D>, op5: PromiseOp<D, E>, op6: PromiseOp<E, F>, op7: PromiseOp<F, G>, op8: PromiseOp<G, H>): PromisePipe<T, H>;
function promisePipe<T, A, B, C, D, E, F, G, H, I>(op1: PromiseOp<T, A>, op2: PromiseOp<A, B>, op3: PromiseOp<B, C>, op4: PromiseOp<C, D>, op5: PromiseOp<D, E>, op6: PromiseOp<E, F>, op7: PromiseOp<F, G>, op8: PromiseOp<G, H>, op9: PromiseOp<H, I>): PromisePipe<T, I>;
function promisePipe<T>(...operations: PromiseOp<any, any>[]): PromisePipe<T, any>;
function promisePipe<T>(...operations: PromiseOp<any, any>[]): PromisePipe<T, any> {
	return (initialValue: T) => (async () => {
		let value = await initialValue;
		for (const fn of operations) {
			value = await fn(value);
		}
		return value;
	})();
}
/* eslint-enable max-len */

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

/** Creates a ISO date string without time ("YYYY-MM-DD") from a Date object  */
export const dateToISODate = (date: Date): string => date.toISOString().split("T")[0] as string;

// TS is wrong here, `Date.parse()` accepts `Date`.
export const isValidDate = (date?: Date) => !isNaN(Date.parse(date as unknown as string));

/** @throws Error if array is shorter than n */
export const nthFromNonEmptyArr = (n: number) => <T>(arr: T[]): T => {
	if (arr.length - 1 < n) {
		throw new Error(`Array doesn't have index ${n}`);
	}
	return arr[n]!;
};

/** @throws Error if array is empty */
export const firstFromNonEmptyArr = nthFromNonEmptyArr(0);

/** @throws Error if array is empty */
export const lastFromNonEmptyArr = <T>(arr: T[]): T => {
	if (arr.length === 0) {
		throw new Error("Array was empty");
	}
	return arr[arr.length - 1]!;
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


/** Filters all except strings and numbers out and joins them with given separator */
export const joinOnlyStringsWith = (separator = " ") => (...array: (unknown)[]) => {
	return array.filter(m => typeof m === "string" || typeof m === "number").join(separator);
};

/** Filters all except strings and numbers out and joins them with " " */
export const joinOnlyStrings = joinOnlyStringsWith();

export class ErrorCodeException extends HttpException {
	context?: Record<string, string>;
	errorCode: string;
	constructor(errorCode: string, statusCode: number)  {
		super(errorCode, statusCode);
		this.errorCode = errorCode;
	}
}

/** LocalizerExceptionFilter takes care of localizing the exception based on the error code */
export class LocalizedException extends ErrorCodeException {
	context?: Record<string, string>;
	localized = true;
	constructor(errorCode: keyof typeof translations, statusCode: number, context?: Record<string, string>)  {
		super(errorCode, statusCode);
		this.context = context;
	}
}

export class ExternalException extends HttpException {
	context?: Record<string, string>;
	errorCode = "EXTERNAL";
	json?: JSONObjectSerializable;
	constructor(message: string, statusCode: number, json?: JSONObjectSerializable)  {
		super(message, statusCode);
		this.json = json;
	}
}
