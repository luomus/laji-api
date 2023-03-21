import { classToPlain, ClassTransformOptions, plainToClass } from "class-transformer";

export const isObject = (any: any): any is Record<string, unknown> =>
	typeof any === "object" && !Array.isArray(any) && any !== null;

export type JSON = string | number | boolean | JSONObject | JSON[] | null;
export type JSONObject = { [prop: string]: JSON };

export const isJSONObject = (json?: JSON): json is JSONObject => isObject(json);

export const isJSONObjectOrUndefined = (v?: JSON): v is (undefined | JSON) => v === undefined || isJSONObject(v);

type Newable<T> = { new (...args: any[]): T; };

export const serializeInto = <T>(Class: Newable<T>, options?: ClassTransformOptions) => (item: any) => {
	const plainItem = item.construct === Object
		? item
		: classToPlain(item);
	return plainToClass(Class, plainItem, options);
};
