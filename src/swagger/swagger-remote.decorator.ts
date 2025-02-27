import { isObject } from "src/typing.utils";
import { SwaggerCustomizationCommon, createSwaggerScanner } from "./swagger-scanner";

export type SwaggerRemoteRefEntry = SwaggerCustomizationCommon & {
	/** The remote source */
	source: "store",
	/** The name of the schema object in the remote OpenAPI document's schemas */
	ref: string,
	/**
	 * Replaces the given pointer in the response schema. If not defined, the whole response schema will be replaced.
	 * Uses JSON pointer notation. Has lower precedence than `customizeResponseSchema`.
	 */
	replacePointer?: string;
};

export const isSwaggerRemoteRefEntry = (entry: unknown): entry is SwaggerRemoteRefEntry =>
	isObject(entry) && "source" in entry && "ref" in entry;

const SWAGGER_REMOTE_METADATA = "SWAGGER_REMOTE_METADATA";

/**
 * Allows defining a remote Swagger schema ref for a controller method. The referred schema is merged into our own
 *   OpenAPI document. The result will be magically paginated also.
 *
 * Note that the controller must be decorated with either `@LajiApiController()` or `@SwaggerRemoteScanner()`!
 * */
export function SwaggerRemoteRef(entry: SwaggerRemoteRefEntry) {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	return function (target: any, propertyKey: any) {
		Reflect.defineMetadata(SWAGGER_REMOTE_METADATA + propertyKey, entry, target);
	};
}

export const SwaggerRemoteScanner = createSwaggerScanner(SWAGGER_REMOTE_METADATA);
