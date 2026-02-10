import { Controller, applyDecorators } from "@nestjs/common";
import { ApiExcludeController, OpenAPIObject } from "@nestjs/swagger";
import { PathsObject, RequestBodyObject, ResponseObject }
	from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { JSONSchema, isJSONSchemaArray, isJSONSchemaObject, isJSONSchemaRef } from "src/json-schema.utils";

export type PatchSwagger = (document: OpenAPIObject, remoteSwaggerDoc: OpenAPIObject) => OpenAPIObject;
export type FetchSwagger = () => Promise<OpenAPIObject>;

export type RemoteSwaggerEntry = {
	name: string,
	// eslint-disable-next-line @typescript-eslint/ban-types
	instance: Function & {
		patchSwagger: PatchSwagger,
		fetchSwagger: FetchSwagger
	}
}

export const instancesWithRemoteSwagger: RemoteSwaggerEntry[] = [];

const ConnectToSwaggerService = (target: any) => {
	instancesWithRemoteSwagger.push({ name: target.name, instance: target });
};

export const RemoteSwaggerMerge = (prefix: string) => applyDecorators(
	ApiExcludeController(),
	Controller(prefix),
	ConnectToSwaggerService,
);

export abstract class MergesRemoteSwagger {
	/**
	 * Patch our Swagger document with the remote Swagger document. Needed for the abstract `@MergesRemoteSwagger()`, that
	 * must be implemented for a `Controller` having the `RemoteSwaggerMerge` decorator.
	 **/
	abstract patchSwagger: PatchSwagger;
	/**
	 * Fetch the remote swagger document. SwaggerService takes care of caching. Needed for the abstract
	 * `MergesRemoteSwagger`, that must be implemented for a `Controller` having the `@RemoteSwaggerMerge()` decorator.
	 **/
	abstract fetchSwagger: FetchSwagger;
}

export const patchSwaggerWith = (pathMatcher?: string, pathPrefix: string = "", tag?: string, modelPrefix?: string) =>
	(document: OpenAPIObject, remoteDocument: OpenAPIObject): OpenAPIObject => {
		const remotePaths = Object.keys(remoteDocument.paths).reduce((paths, p) => {
			if (typeof pathMatcher === "string" && !p.startsWith(pathMatcher)) {
				return paths;
			}
			const pathItem = remoteDocument.paths[p]!;
			for (const operationName of (["get", "put", "post", "delete"] as const)) {
				const operation = pathItem[operationName];
				if (!operation) {
					continue;
				}
				operation.security = [ { access_token: [] } ];
				if (tag) {
					operation.tags = [tag];
				}
				if (modelPrefix) {
					if (operation.responses) {
						for (const statusCode of Object.keys(operation.responses)) {
							const { content } = operation.responses[statusCode] as ResponseObject;
							if (!content) {
								continue;
							}
							for (const responseType of Object.keys(content)) {
								const modelSchema = content[responseType]!.schema;
								if (!modelSchema) {
									continue;
								}
								fixRefsModelPrefix(modelSchema as JSONSchema, modelPrefix);
							}
						}
					}
					const { content } = operation.requestBody as RequestBodyObject || {};
					if (content) {
						for (const responseType of Object.keys(content)) {
							if (content[responseType]!.schema) {
								fixRefsModelPrefix(content[responseType]!.schema as JSONSchema, modelPrefix);
							}
						}
					}
				}
			}
			paths[pathPrefix + p] = pathItem;
			return paths;
		}, {} as PathsObject);
		document.paths = {
			...document.paths,
			...remotePaths
		};
		if (!modelPrefix) {
			document.components!.schemas = {
				...document.components!.schemas,
				...remoteDocument.components!.schemas
			};
		} else {
			document.components!.schemas = {
				...document.components!.schemas,
				...Object.keys(remoteDocument.components!.schemas!).reduce((schemas, name) => {
					(schemas as any)[modelPrefix + name] = remoteDocument.components!.schemas![name];
					fixRefsModelPrefix(remoteDocument.components!.schemas![name]! as JSONSchema, modelPrefix);
					return schemas;
				}, {})
			};
		}
		return document;
	};

export const fixRefsModelPrefix = (schema: JSONSchema, modelPrefix: string) => {
	if (isJSONSchemaRef(schema)) {
		const uriFragments = schema.$ref.split("/");
		const lastRefPart = uriFragments.pop() as string;
		// There can be multiple identical refs, and `fixRefsModelPrefix()` mutates the schema so need to prevent adding a duplicate prefix
		if (lastRefPart.startsWith(modelPrefix)) {
			return;
		}
		schema.$ref = [...uriFragments, modelPrefix + lastRefPart].join("/");
	} else if (isJSONSchemaArray(schema)) {
		fixRefsModelPrefix(schema.items, modelPrefix);
	} else if (isJSONSchemaObject(schema) && schema.properties) {
		Object.keys(schema.properties).forEach(key => {
			fixRefsModelPrefix(schema.properties![key]!, modelPrefix);
		});
	}
};
