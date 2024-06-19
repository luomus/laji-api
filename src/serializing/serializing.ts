import { classToPlain, Exclude, Expose, plainToInstance, Transform } from "class-transformer";
import { isObject, Newable } from "src/type-utils";
import { whitelistKeys } from "src/utils";
import { getPrivateDecorator } from "./private.decorator";
import { applyDecorators } from "@nestjs/common";
import { IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

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
	const instance = plainToInstance(Class, plainItem, { enableImplicitConversion: true });
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

export const excludePrivateProps = (item: any): any => {
	if (Array.isArray(item) && isObject(item[0]) && item[0].constructor !== Object) {
		return item.map(excludePrivateProps);
	} else if (!isObject(item) || item.constructor === Object) {
		return item;
	}
	return Object.keys(item as any).reduce((excludedItem: any, k: string) => {
		const excludedByDecorator = getPrivateDecorator(item, k);
		if (excludedByDecorator) {
			return excludedItem;
		}
		excludedItem[k] = excludePrivateProps(item[k]);
		return excludedItem;
	}, {});
};

export const serialize = <T>(item: any, Class: Newable<T>, options?: SerializeOptions) =>
	serializeInto(Class, options)(item);

const optionalBooleanMapper = new Map([
	  ["true", true],
	  ["false", false]
]);

export const IsOptionalBoolean = () => applyDecorators(
	IsBoolean(),
	// https://github.com/typestack/class-transformer/issues/676
	Transform(({ value }) => optionalBooleanMapper.get(value)),
);

export const CommaSeparatedStrings = () => applyDecorators(
	Transform(({ value }: { value: string }) => value.trim().length
		? value.split(",").filter(id => !!id)
		: undefined
	),
	ApiProperty({ type: String, required: false })
);

export const pickAsExposed = <T, K extends (string | symbol) & keyof T>
	(_class: Newable<T>, ...properties: K[]): Pick<T, K> & Newable<Pick<T, K>> => {
	@Exclude() class Picked {};
	properties.forEach(p => {
		Expose()(Picked, (p as string | symbol));
	});
	return Picked as Pick<T, K> & Newable<Pick<T, K>>;
};

/** Serializes the instance into the given class filtering all non defined values. */
export const pickAndSerialize = <T, K extends (string | symbol) & keyof T>(
	serializeInto: Newable<T>,
	instance: any,
	...keys: K[]
) => plainToInstance(pickAsExposed(serializeInto, ...keys), instance, { exposeUnsetFields: false });
