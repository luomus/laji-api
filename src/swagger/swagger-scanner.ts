import { PATH_METADATA } from "@nestjs/common/constants";
import { SwaggerRemoteRefEntry } from "./swagger-remote.decorator";
import { SerializeEntry } from "src/serialization/serialize.decorator";
import { SchemaItem } from "./swagger.service";
import { OpenAPIObject } from "@nestjs/swagger";


export type HasSchemaDefinitionName = { schemaDefinitionName: string };

export type SwaggerCustomizationCommon = Partial<HasSchemaDefinitionName> & {
	/** Function to customize the OpenAPI response schema. Has higher precedence than `replacePointer` */
	customizeResponseSchema?: (schema: SchemaItem, document: OpenAPIObject) => SchemaItem;
	/** Function to customize the OpenAPI request body schema. */
	customizeRequestBodySchema?: (schema: SchemaItem, document: OpenAPIObject, remoteDocument: OpenAPIObject)
		=> SchemaItem;
	customize?: (document: OpenAPIObject, remoteDocument: OpenAPIObject) => OpenAPIObject;
	/** The remote ref is applied to response (201 or 200). Defaults to true. */
	applyToResponse?: boolean;
}

export type SwaggerCustomizationEntry = (SwaggerRemoteRefEntry | SerializeEntry) & {
	controller: string;
};

export const swaggerCustomizationEntries: {
	[path: string]: {
		[method: string]: SwaggerCustomizationEntry[]
	}
} = {};


/**
 * Creates a class controller that allow usage of a method decorator controlled with param `metadataKey`.
 *
 * The created class decorator must be applied before the `@Controller()` decorator!
 * */
export function createSwaggerScanner(metadataKey: string) {
	return () => (target: any) => {
		Reflect.ownKeys(target.prototype).forEach(propertyKey => {
			const entry = Reflect.getMetadata(metadataKey + (propertyKey as string), target.prototype);

			if (!entry) {
				return;
			}
			// The path defined by `@Controller()` decorator.
			const path = Reflect.getMetadata(PATH_METADATA, target);

			const existingEntries = swaggerCustomizationEntries[path]?.[(propertyKey as string)] || [];
			swaggerCustomizationEntries[path] = {
				...(swaggerCustomizationEntries[path] || {}),
				[propertyKey]: [ ...existingEntries, { ...entry, controller: target.name } ]
			};
		});
	};
}
