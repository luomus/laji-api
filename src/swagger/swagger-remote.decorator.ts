import { PATH_METADATA } from "@nestjs/common/constants";

export type SwaggerRemoteRefEntry = {
	/** The remote source */
	source: "store",
	/** The name of the schema object in the remote OpenAPI document's schemas */
	ref: string
};

export const swaggerRemoteRefs: {[path: string]: {[method: string]: SwaggerRemoteRefEntry}} = {};

const SWAGGER_REMOTE_METADATA = "SWAGGER_REMOTE_METADATA";

/**
 * Allows defining a remote Swagger schema ref for a controller method. The referred schema is merged into our own
 *   OpenAPI document. The result will be magically paginated also.
 *
 * Note that the controller must be decorated with `@SwaggerRemote()`!
 * */
export function SwaggerRemoteRef(entry: SwaggerRemoteRefEntry) {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	return function (target: any, propertyKey: any) {
		Reflect.defineMetadata(SWAGGER_REMOTE_METADATA + propertyKey, entry, target);
	}
}

/**
 * Allow usage of `@SwaggerRemoteRef()` method decorator.
 *
 * Must be defined before the `@Controller()` decorator!
 * */
export function SwaggerRemote() {
	return (target: any) => {
		Reflect.ownKeys(target.prototype).forEach(propertyKey => {
			const metadata = Reflect.getMetadata(SWAGGER_REMOTE_METADATA + (propertyKey as any), target.prototype);

			if (!metadata) {
				return;
			}
			// The path defined by @Controller() decorator.
			const path = Reflect.getMetadata(PATH_METADATA, target)
			swaggerRemoteRefs[path] = {
				...(swaggerRemoteRefs[path] || {}),
				[propertyKey]: metadata
			}
		});
	}
}
