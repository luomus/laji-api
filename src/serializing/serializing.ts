import { classToPlain, plainToClass, Transform } from "class-transformer";
import { isObject, Newable } from "src/type-utils";
import { whitelistKeys } from "src/utils";
import { getPrivateDecorator } from "./private.decorator";

export type SerializeOptions = {
	excludePrefix?: string;
	whitelist?: string[]
	filterNulls?: boolean;
}

/**
 * NestJS has it's own implementation for serialization, but it doesn't work when used with the swagger CLI plugin.
 *   It for example won't respect the default values of the classes when serializing. So, we have a custom
 *   implementation.
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
	const instance = plainToClass(Class, plainItem);
	(excludePrefix || filterNulls) && Object.keys(instance as any).forEach(k => {
		if (typeof excludePrefix === "string" &&  k.startsWith(excludePrefix)) {
			delete (instance as any)[k];
		}
		if ((instance as any)[k] === null) {
			delete (instance as any)[k];
		}
	});
	whitelist && whitelistKeys(instance as any, whitelist);
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
};

export const serialize = <T>(item: any, Class: Newable<T>, options?: SerializeOptions) =>
	serializeInto(Class, options)(item);

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

const optionalBooleanMapper = new Map([
	  ["true", true],
	  ["false", false],
]);

/** https://github.com/typestack/class-transformer/issues/676 */
export const ParseOptionalBoolean = () =>
	  Transform(({ value }) => optionalBooleanMapper.get(value));
