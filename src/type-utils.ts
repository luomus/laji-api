import { classToPlain, plainToClass, Transform } from "class-transformer";
import "reflect-metadata";

export const isObject = (any: any): any is Record<string, unknown> =>
	typeof any === "object" && !Array.isArray(any) && any !== null;

export type JSON = string | number | boolean | JSONObject | JSON[] | null;
export type JSONObject = { [prop: string]: JSON };

export const isJSONObject = (json?: JSON): json is JSONObject => isObject(json);

export const isJSONObjectOrUndefined = (v?: JSON): v is (undefined | JSON) => v === undefined || isJSONObject(v);

export type Newable<T> = { new (...args: any[]): T; };

export type SerializeOptions = {
	excludePrefix?: string;
	whitelist?: string[]
	filterNulls?: boolean;
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
export const serializeInto = <T>(Class: Newable<T>, options?: SerializeOptions) => (item: any): T => {
	const {
		excludePrefix = "_",
		whitelist,
		filterNulls,
	} = options || {};

	const plainItem = item.construct === Object
		? item
		: classToPlain(item);
	item.lol = 2;
	const instance = plainToClass(Class, plainItem);
	const knownKeys = dictionarify(Object.getOwnPropertyNames(instance));
	(excludePrefix || filterNulls) && Object.keys(instance as any).forEach(k => {
		if (typeof excludePrefix === "string" &&  k.startsWith(excludePrefix)) {
			delete (instance as any)[k];
		}
		if ((instance as any)[k] === null) {
			delete (instance as any)[k];
		}
	});
	whitelist && Object.keys(knownKeys).forEach(prop => {
		if (!whitelist.includes(prop)) {
			delete (instance as any)[prop];
		}
	});
	return instance;
};

export const excludePrivateProps = (item: any) => {
	if (!isObject(item) || item.construct === Object) {
		return item;
	}
	return Object.keys(item as any).reduce((excludedItem: any, k: string) => {
		const excludedByDecorator = getPrivateDecorator(item, k);
		if (excludedByDecorator) {
			return excludedItem;
		}
		excludedItem[k] = item[k];
		return excludedItem;
	}, {});
}

const excludeMetadataKey = Symbol("Private");

/**
 * Mark a poperty to be excluded when serialized by SerializingInterceptor.
 */
export function Private() {
	  return Reflect.metadata(excludeMetadataKey, "PRIVATE");
}

function getPrivateDecorator(target: any, propertyKey: string) {
	  return Reflect.getMetadata(excludeMetadataKey, target, propertyKey);
}

export const serialize = <T>(item: any, Class: Newable<T>, options?: SerializeOptions) =>
	serializeInto(Class, options)(item);

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

const optionalBooleanMapper = new Map([
	  ["true", true],
	  ["false", false],
]);

/**
 * https://github.com/typestack/class-transformer/issues/676
 */
export const ParseOptionalBoolean = () =>
	  Transform(({ value }) => optionalBooleanMapper.get(value));
