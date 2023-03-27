import { classToPlain, plainToClass } from "class-transformer";
import "reflect-metadata";

export const isObject = (any: any): any is Record<string, unknown> =>
	typeof any === "object" && !Array.isArray(any) && any !== null;

export type JSON = string | number | boolean | JSONObject | JSON[] | null;
export type JSONObject = { [prop: string]: JSON };

export const isJSONObject = (json?: JSON): json is JSONObject => isObject(json);

export const isJSONObjectOrUndefined = (v?: JSON): v is (undefined | JSON) => v === undefined || isJSONObject(v);

type Newable<T> = { new (...args: any[]): T; };

type SerializeOptions = {
	includeOnlyTyped?: boolean;
	excludePrefix?: string;
	whitelist?: string[]
}

const dictionarify = (arr: string[]) =>
	arr.reduce<Record<string, boolean>>((dict, item) => {
		dict[item] = true;
		return dict;
	}, {});

/**
 * NestJS has it's own implementation for serialization, but it doesn't work when used with the swagger CLI plugin.
 * It for example won't respect the default values of the classes when serializing. So, we have a custom implementation.
 */ 
export const serializeInto = <T>(Class: Newable<T>, options?: SerializeOptions) => (item: any) => {
	const {
		includeOnlyTyped = false,
		excludePrefix = "_",
		whitelist
	} = options || {};

	const plainItem = item.construct === Object
		? item
		: classToPlain(item);
	const instance = plainToClass(Class, plainItem);
	const knownKeys = dictionarify(Object.getOwnPropertyNames(instance));
	if (includeOnlyTyped || excludePrefix) {
		Object.keys(instance as any).forEach(k => {
			if (includeOnlyTyped && !knownKeys[k]) {
				delete (instance as any)[k];
			}
			if (typeof excludePrefix === "string" &&  k.startsWith(excludePrefix)) {
				delete (instance as any)[k];
			}
		})
	}
	whitelist && Object.keys(knownKeys).forEach(prop => {
		if (!whitelist.includes(prop)) {
			delete (instance as any)[prop];
		}
	});
	return instance;
};

export const serialize = <T>(item: any, Class: Newable<T>, options?: SerializeOptions) =>
	serializeInto(Class, options)(item);
