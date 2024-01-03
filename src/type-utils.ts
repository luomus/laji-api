
export const isObject = (any: any): any is Record<string, unknown> =>
	typeof any === "object" && !Array.isArray(any) && any !== null;

export type JSON = string | number | boolean | JSONObject | JSON[] | null;
export type JSONObject = { [prop: string]: JSON };

export const isJSONObject = (json?: JSON): json is JSONObject => isObject(json);

export const isJSONObjectOrUndefined = (v?: JSON): v is (undefined | JSON) => v === undefined || isJSONObject(v);

export type Newable<T> = { new (...args: any[]): T; };

// const optionalBooleanMapper = new Map([
// 	  ["true", true],
// 	  ["false", false],
// ]);
// /** https://github.com/typestack/class-transformer/issues/676 */
// export const ParseOptionalBoolean = () =>
// 	  Transform(({ value }) => optionalBooleanMapper.get(value));
