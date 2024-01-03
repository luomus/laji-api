import { Inject, Injectable, Logger } from "@nestjs/common";
import { OpenAPIObject } from "@nestjs/swagger";
import { RestClientService } from "src/rest-client/rest-client.service";
import { CACHE_30_MIN, pipe } from "src/utils";
import { OperationObject, ParameterObject, ReferenceObject, SchemaObject }
	from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { SwaggerRemoteRefEntry, swaggerRemoteRefs } from "./swagger-remote.decorator";
import { Interval } from "@nestjs/schedule";

@Injectable()
export class SwaggerService {

	storeSwaggerDoc?: OpenAPIObject;
	cachedPatchedDoc?: OpenAPIObject;

	private logger = new Logger(SwaggerService.name);

	constructor(
		@Inject("STORE_REST_CLIENT") private storeClient: RestClientService,
	) {
		this.patchGlobalSchemaRefs = this.patchGlobalSchemaRefs.bind(this);
		this.patchRemoteRefs = this.patchRemoteRefs.bind(this);
	}

	onModuleInit() {
		this.logger.log("Loading remote sources for patching Swagger in background  started...");
		this.update().then(() => {
			this.logger.log("Loading remote sources for patching Swagger in background complete");
		});
	}

	@Interval(CACHE_30_MIN)
	async update() {
		this.storeSwaggerDoc = await this.storeClient.get("documentation-json");
		this.cachedPatchedDoc = undefined;
	}

	patch(document: OpenAPIObject) {
		if (!this.storeSwaggerDoc) {
			throw new Error("Remote swagger docs weren't loaded yet. Try again soon.");
		}

		if (this.cachedPatchedDoc) {
			return this.cachedPatchedDoc;
		}

		this.cachedPatchedDoc = pipe(document, this.patchGlobalSchemaRefs, this.patchRemoteRefs);
		return this.cachedPatchedDoc;
	}

	private patchGlobalSchemaRefs(document: OpenAPIObject) {
		document!.components!.schemas!.multilang = 
					(this.storeSwaggerDoc!.components!.schemas as Record<string, SchemaObject>).multilang;
		return document;
	}

	/**
	 * Iterates through the whole OpenAPIObject tree and patches it by:
	 * 1. replaces remote entries defined by `@SwaggerRemoteRef` decorator
	 * 2. Fixes response pagination globally
	 *
	 * Patching is performed mutably.
	 */
	private patchRemoteRefs(document: OpenAPIObject) {
		Object.keys(swaggerRemoteRefs).forEach((path: string) => {
			Object.keys(swaggerRemoteRefs[path]).forEach((methodName: string) => {
				const entry = swaggerRemoteRefs[path][methodName];
				const remoteDoc = this.getRemoteSwaggerDoc(entry);
				const remoteSchemas = (remoteDoc!.components!.schemas as Record<string, SchemaObject>); 
				document!.components!.schemas![entry.ref] = remoteSchemas[entry.ref];
				for (const iteratedPath of Object.keys(document.paths)) {
					const pathItem = document.paths[iteratedPath];
					for (const operationName of (["get", "put", "post", "delete"] as const)) {
						const operation = pathItem[operationName];
						if (!operation) {
							continue;
						}
						const existingSchema: SchemaObject | ReferenceObject | undefined
							= (operation.responses as any)["200"]?.content?.["application/json"]?.schema;
						const schema: SchemaObject | ReferenceObject | undefined = pipe(
							existingSchema,
							replaceWithRemoteAsNeededWith(path, methodName, iteratedPath, operation, entry),
							paginateAsNeededWith(operation)
						);
						if (schema) {
							(operation.responses as any)["200"].content = {
								"application/json": { schema }
							}
						}
					}
				}
			});
		});
		return document;
	}

	private getRemoteSwaggerDoc(entry: SwaggerRemoteRefEntry) {
		switch (entry.source) {
		case "store":
			return this.storeSwaggerDoc;
		}
	}
}

const replaceWithRemoteAsNeededWith = (
	remoteEntryPath: string,
	remoteEntryMethodName: string,
	iteratedPath: string,
	operation: OperationObject,
	entry: SwaggerRemoteRefEntry) =>
	(schema?: SchemaObject | ReferenceObject) => {
		if (
			iteratedPath !== `/${remoteEntryPath}` && !iteratedPath.startsWith(`/${remoteEntryPath}/`)
			|| operation?.operationId !== remoteEntryMethodName
		) {
			return schema;
		}
		return { "$ref": `#/components/schemas/${entry.ref}` };
	}

const isPagedOperation = (operation: OperationObject): boolean => {
	for (const param of (operation.parameters || [])) {
		if ((param as ParameterObject).name === "page") {
			return true;
		}
	}
	return false;
};

const asPagedResponse = (schema: SchemaObject | ReferenceObject): SchemaObject => ({
	type: "object",
	properties: {
		page: { type: "number" },
		pageSize: { type: "number" },
		total: { type: "number" },
		lastPage: { type: "number" },
		prevPage: { type: "number" },
		nextPage: { type: "number" },
		results: { type: "array", items: schema },
	},
	required: [ "page", "pageSize", "total", "lastPage", "results"]
});

const isSchemaObject = (schema: SchemaObject | ReferenceObject): schema is SchemaObject => !!(schema as any).type;

const isPagedSchema = (schema: SchemaObject | ReferenceObject) =>
	isSchemaObject(schema) && schema.type === "object" && schema.properties?.page;

const paginateAsNeededWith = (operation: OperationObject) =>
	(schema?: SchemaObject | ReferenceObject) => 
		(schema && isPagedOperation(operation) && !isPagedSchema(schema))
			? asPagedResponse(schema)
			: schema;
