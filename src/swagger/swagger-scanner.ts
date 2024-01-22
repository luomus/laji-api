import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { SwaggerRemoteRefEntry } from "./swagger-remote.decorator";
import { SerializeEntry } from "src/serializing/serialize.decorator";

export type SwaggerCustomizationEntry = SwaggerRemoteRefEntry | SerializeEntry;

export const swaggerCustomizationEntries: {
	[path: string]: {
		[method: string]: {
			[responseCode: string]: SwaggerCustomizationEntry[]
		}
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

			// The method defined by methods method decorator (`@Get()`, `@Post()`, ...).
			const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, target.prototype[propertyKey])];
			const responseCode = method === "POST"
				? 201 : 200;
			const existingEntries = swaggerCustomizationEntries[path]?.[(propertyKey as string)]?.[responseCode] || [];
			swaggerCustomizationEntries[path] = {
				...(swaggerCustomizationEntries[path] || {}),
				[propertyKey]: { [responseCode]: [ ...existingEntries, entry ] }
			};
		});
	};
}
