import { PATH_METADATA } from "@nestjs/common/constants";
import { SwaggerRemoteRefEntry } from "./swagger-remote.decorator";
import { SerializeEntry } from "src/serialization/serialize.decorator";
import { SchemaItem } from "./swagger.service";


export type SwaggerCustomizationCommon = {
	/** Function to customize the OpenAPI schema. Has higher precedence than `replacePointer` */
	customize?: (schema: SchemaItem) => SchemaItem;
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
