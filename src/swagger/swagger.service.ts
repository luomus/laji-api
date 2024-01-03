import { Inject, Injectable } from "@nestjs/common";
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

	constructor(
		@Inject("STORE_REST_CLIENT") private storeClient: RestClientService
	) {
		this.patchGlobalSchemaRefs = this.patchGlobalSchemaRefs.bind(this);
		this.patchRemoteRefs = this.patchRemoteRefs.bind(this);
	}

	onModuleInit() {
		this.update();
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

		return pipe(document, this.patchGlobalSchemaRefs, this.patchRemoteRefs);
	}

	private patchGlobalSchemaRefs(document: OpenAPIObject) {
		document!.components!.schemas!.multilang = 
					(this.storeSwaggerDoc!.components!.schemas as Record<string, SchemaObject>).multilang;
		return document;
	}

	private patchRemoteRefs(document: OpenAPIObject) {
		Object.keys(swaggerRemoteRefs).forEach((path: string) => {
			Object.keys(swaggerRemoteRefs[path]).forEach((methodName: string) => {
				const entry = swaggerRemoteRefs[path][methodName];
				const remoteDoc = this.getRemoteSwaggerDoc(entry);
				const remoteSchemas = (remoteDoc!.components!.schemas as Record<string, SchemaObject>); 
				document!.components!.schemas![entry.ref] = remoteSchemas[entry.ref];
				for (const iteratedPath of Object.keys(document.paths)) {
					if (iteratedPath !== `/${path}` && !iteratedPath.startsWith(`/${path}/`)) {
						continue;
					}
					const pathItem = document.paths[iteratedPath];
					for (const operationName of (["get", "put", "post", "delete"] as const)) {
						const operation = pathItem[operationName];
						if (operation?.operationId !== methodName) {
							continue;
						}
						const schema: SchemaObject | ReferenceObject = pipe(
							{ "$ref": `#/components/schemas/${entry.ref}` },
							paginateAsNeededWith(operation)
						);
						(operation.responses as any)["200"].content = {
							"application/json": { schema }
						}
						if (isPagedOperation(operation)) {
							
							asPagedResponse
						}
						break
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

const isPagedOperation = (operation: OperationObject) => {
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

const paginateAsNeededWith = (operation: OperationObject) =>
	(schema: SchemaObject | ReferenceObject) =>
		isPagedOperation(operation) ? asPagedResponse(schema) : schema;
