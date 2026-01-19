import { Controller, applyDecorators } from "@nestjs/common";
import { ApiExcludeController, OpenAPIObject } from "@nestjs/swagger";
import { PathsObject, ResponseObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
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

export const ConnectToSwaggerService = (target: any) => {
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
				if (modelPrefix && operation.responses) {
					for (const statusCode of Object.keys(operation.responses)) {
						const modelSchema =
							(operation.responses[statusCode] as ResponseObject)!.content?.["application/json"]?.schema;
						if (!modelSchema || !isJSONSchemaRef(modelSchema)) {
							continue;
						}
						const uriFragments = modelSchema.$ref.split("/");
						const last = uriFragments.pop() as string;
						modelSchema.$ref = [...uriFragments, modelPrefix + last].join("/");
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

const fixRefsModelPrefix = (schema: JSONSchema, modelPrefix: string) => {
	if (isJSONSchemaRef(schema)) {
		const uriFragments = schema.$ref.split("/");
		const last = uriFragments.pop() as string;
		schema.$ref = [...uriFragments, modelPrefix + last].join("/");
	} else if (isJSONSchemaArray(schema)) {
		fixRefsModelPrefix(schema.items, modelPrefix);
	} else if (isJSONSchemaObject(schema) && schema.properties) {
		Object.keys(schema.properties).forEach(key => {
			fixRefsModelPrefix(schema.properties![key]!, modelPrefix);
		});
	}
};
