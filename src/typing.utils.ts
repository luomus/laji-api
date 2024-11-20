/** Is what you would intuitively call an object. That is, it's typeof === "object" but not `Array` or `null`. */
export const isObject = (any: unknown): any is Record<string, unknown> =>
	typeof any === "object" && !Array.isArray(any) && any !== null;

export type JSONSerializable = string | number | boolean | null | JSONObjectSerializable | JSONSerializable[];
export type JSONObjectSerializable<T = any> = { [prop in keyof T & string]: JSONSerializable };

export const isJSONObjectSerializable = (json?: JSONSerializable): json is JSONObjectSerializable => isObject(json);

export const isJSONObjectSerializableOrUndefined = (v?: JSONSerializable)
	: v is (undefined | JSONSerializable) =>
	v === undefined || isJSONObjectSerializable(v);

export type Newable<T> = { new (...args: any[]): T; };

export const isPlainObject = <T>(item: Newable<T> | T) => (item as any).constructor === Object;

export type Flatten<T> = T extends any[] ? T[number] : T;
export type MaybeArray<T> = T | Array<T>;
export type MaybePromise<T> = T | Promise<T>;

export const omitForKeys = <T extends object, K extends keyof T = keyof T>(...keys: K[]) =>
	(obj: T): Omit<T, K> => {
		const dict = new Set(keys);
		return (Object.keys(obj) as K[]).reduce((filtered, key) => {
			if (!dict.has(key)) {
				filtered[key] = obj[key];
			}
			return filtered;
		}, {} as T) as Omit<T, K>;
	};

export const omit = <T extends object, K extends keyof T>(
	obj: T,
	...keys: K[]
) => omitForKeys<T, K>(...keys)(obj);

export const hasKey = <T extends object, K extends keyof T>(
	obj: T,
	key: K
): obj is WithNonNullableKeys<T, K> => key in obj;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<{ [K: string]: T[K] }>;

/** `keyof T` excluding number an symbol. Useful when the domain deals only with string keys. */
export type KeyOf<T> = keyof T & string;

export type WithNonNullableKeys<T, K extends keyof T> = T & {
	[P in K]-?: NonNullable<T[P]>;
};

export type MaybeContextual = { "@context"?: string, id?: string };
export type RemoteContextual<T extends { "@context"?: string, id?: string }> =
	WithNonNullableKeys<T, "@context" | "id">;
