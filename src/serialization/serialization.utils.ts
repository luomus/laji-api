import { instanceToPlain, Exclude, Expose, plainToInstance, Transform } from "class-transformer";
import { Newable } from "src/typing.utils";
import { whitelistKeys } from "src/utils";
import { applyDecorators } from "@nestjs/common";
import { IsBoolean, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export type SerializeOptions = {
	excludePrefix?: string;
	whitelist?: string[]
	filterNulls?: boolean;
}

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
		: instanceToPlain(item);
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

export const serialize = <T>(item: any, Class: Newable<T>, options?: SerializeOptions) =>
	serializeInto(Class, options)(item);

const optionalBooleanMapper = new Map([
	  ["true", true],
	  ["false", false],
	  ["undefined", undefined]
]);

export const IsOptionalBoolean = () => applyDecorators(
	IsOptional(),
	IsBoolean(),
	// https://github.com/typestack/class-transformer/issues/676
	Transform(({ value }) => optionalBooleanMapper.get(value)),
);

export const CommaSeparatedStrings = (delimiter = ",") => applyDecorators(
	Transform(({ value }: { value: string }) => value.trim().length
		? value.split(delimiter).filter(id => !!id)
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
