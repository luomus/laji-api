export const isObject = (any: unknown): any is Record<string, unknown> =>
	typeof any === "object" && !Array.isArray(any) && any !== null;

export type JSONSerializable = string | number | boolean | JSONObjectSerializable | JSONSerializable[] | null;
export type JSONObjectSerializable = { [prop: string]: JSONSerializable };

export const isJSONObjectSerializable = (json?: JSONSerializable): json is JSONObjectSerializable => isObject(json);

export const isJSONObjectSerializableOrUndefined = (v?: JSONSerializable)
	: v is (undefined | JSONSerializable) =>
	v === undefined || isJSONObjectSerializable(v);

export type Newable<T> = { new (...args: any[]): T; };
