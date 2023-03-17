export const isObject = (any: any): any is Record<string, unknown> =>
	typeof any === "object" && !Array.isArray(any) && any !== null;

export type JSON = string | number | boolean | JSONObject | JSON[] | null;
export type JSONObject = { [prop: string]: JSON };

export const isJSONObject = (json?: JSON): json is JSONObject => isObject(json);

export const isJSONObjectOrUndefined = (v?: JSON): v is (undefined | JSON) => v === undefined || isJSONObject(v);

