import { Controller, applyDecorators } from "@nestjs/common";
import { ApiExcludeController, OpenAPIObject } from "@nestjs/swagger";
import { PathsObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

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

export const ConnectToSwaggerService = () => (target: any) => {
	instancesWithRemoteSwagger.push({ name: target.name, instance: target });
};

export const RemoteSwaggerMerge = (prefix: string) => applyDecorators(
	ApiExcludeController(),
	Controller(prefix),
	ConnectToSwaggerService(),
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

export const patchSwaggerWith = (pathMatcher?: string, pathPrefix: string = "") =>
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
			}
			paths[pathPrefix + p] = pathItem;
			return paths;
		}, {} as PathsObject);
		document.paths = {
			...document.paths,
			...remotePaths
		};
		document.components!.schemas = {
			...document.components!.schemas,
			...remoteDocument.components!.schemas
		};
		return document;
	};
