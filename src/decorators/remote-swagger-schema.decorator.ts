export const REMOTE_SWAGGER_SCHEMA = Symbol();

export type RemoteSwaggerSchemaOptions = {
	swaggerHostConfigKey: string;
	swaggerPath: string;
	ref: string;
}

/**
 * Adds a remote swagger JSON schema model for the decorated class. This metadata is consumed by the **Translator
 * interceptor**, that can transform the JSON schema into JSON-LD context, which is needed for knowing which properties
 * are multi lang.
 */
export const RemoteSwaggerSchema = (options?: RemoteSwaggerSchemaOptions) => (target: any) => {
	Reflect.defineMetadata(REMOTE_SWAGGER_SCHEMA, options, target);
};

export const getRemoteSwaggerSchemaOptions = (target: any) => {
	return Reflect.getMetadata(REMOTE_SWAGGER_SCHEMA, target) as RemoteSwaggerSchemaOptions | undefined;
};
