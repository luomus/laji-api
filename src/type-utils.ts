export const isObject = (any: unknown): any is Record<string, unknown> =>
	typeof any === "object" && !Array.isArray(any) && any !== null;

export type JSONSerializable = string | number | boolean | null | JSONObjectSerializable | JSONSerializable[];
export type JSONObjectSerializable = { [prop: string]: JSONSerializable };

export const isJSONObjectSerializable = (json?: JSONSerializable): json is JSONObjectSerializable => isObject(json);

export const isJSONObjectSerializableOrUndefined = (v?: JSONSerializable)
	: v is (undefined | JSONSerializable) =>
	v === undefined || isJSONObjectSerializable(v);

export type Newable<T> = { new (...args: any[]): T; };

export type MaybeArray<T> = T | T[];

export const omit = <T extends object, K extends (string | number | symbol) & keyof T> (
	obj: T,
	...keys: K[]
) : Omit<T, K> => {
	const dict = new Set(keys);
	return (Object.keys(obj) as K[]).reduce((filtered, key) => {
		if (!dict.has(key)) {
			filtered[key] = obj[key];
		}
		return filtered;
	}, {} as T) as Omit<T, K>;
};
