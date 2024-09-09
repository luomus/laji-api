import { Newable, isObject } from "src/type-utils";
import { SerializeOptions } from "src/serializing/serializing";
import { createSwaggerScanner } from "src/swagger/swagger-scanner";
import { UseInterceptors, applyDecorators } from "@nestjs/common";
import { createNewSerializingInterceptorWith } from "./serializing.interceptor";

const SERIALIZE_METADATA = "SERIALIZE_METADATA";

type HasSchemaDefinitionName = { schemaDefinitionName: string };

type SerializeBase = {
	serializeInto: Newable<unknown>;
};
type SerializeEntryWithWhiteList = SerializeBase
	& { serializeOptions: HasWhitelist }
	& HasSchemaDefinitionName;
type SerializeEntryWithoutWhiteList = SerializeBase
	& { serializeOptions?: HasNotWhitelist }
	& Partial<HasSchemaDefinitionName>;
export type SerializeEntry = SerializeEntryWithWhiteList | SerializeEntryWithoutWhiteList;

export const entryHasWhiteList = (entry: SerializeEntry): entry is SerializeEntryWithWhiteList => {
	return (entry.serializeOptions as any)?.whitelist;
};

export const isSerializeEntry = (entry: unknown): entry is SerializeEntry =>
	isObject(entry) && "serializeInto" in entry;

type HasWhitelist = SerializeOptions & Required<Pick<SerializeOptions, "whitelist">>;
type HasNotWhitelist = Omit<SerializeOptions, "whitelist">

type SReturnT = (target: any, propertyKey: any) => void;

type SerializeOverload = {
	(serializeInto: Newable<unknown>, serializeOptions: HasWhitelist, swaggerSchemaDefinitionName: string)
		: SReturnT
	(serializeInto: Newable<unknown>, serializeOptions?: HasNotWhitelist, swaggerSchemaDefinitionName?: string)
		: SReturnT;
}

export const SERIALIZE_OPTIONS_METADATA = "SERIALIZE_OPTIONS_METADATA";

/**
 * Apply our custom serialization to the response. If you provide a whitelist, it's mandatory to also provide a name
 * for the Swagger schema definition.
 */
export const Serialize: SerializeOverload = (...params) =>
	applyDecorators(
		SwaggerSerializeOptionsApplied(...params),
		UseInterceptors(createNewSerializingInterceptorWith(params[0], params[1]))
	);

export const SwaggerSerializeOptionsApplied: SerializeOverload = (
	serializeInto: Newable<unknown>,
	serializeOptions?: SerializeOptions,
	schemaDefinitionName?: string
) => {
	return function (target: any, propertyKey: any) {
		const entry: SerializeEntry = { serializeInto, serializeOptions, schemaDefinitionName };
		Reflect.defineMetadata(
			SERIALIZE_METADATA + propertyKey,
			entry,
			target
		);
	};
};

export const SerializeScanner = createSwaggerScanner(SERIALIZE_METADATA);
