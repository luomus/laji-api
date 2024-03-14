import { Inject, Injectable, Type } from "@nestjs/common";
import { OpenAPIObject } from "@nestjs/swagger";
import { RestClientService } from "src/rest-client/rest-client.service";
import { CACHE_30_MIN, pipe, whitelistKeys } from "src/utils";
import { OperationObject, ParameterObject, PathsObject, ReferenceObject, SchemaObject }
	from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { SwaggerRemoteRefEntry, isSwaggerRemoteRefEntry } from "./swagger-remote.decorator";
import { Interval } from "@nestjs/schedule";
import { SerializeEntry, entryHasWhiteList, isSerializeEntry } from "src/serializing/serialize.decorator";
import { SchemaObjectFactory } from "@nestjs/swagger/dist/services/schema-object-factory";
import { ModelPropertiesAccessor } from "@nestjs/swagger/dist/services/model-properties-accessor";
import { SwaggerTypesMapper } from "@nestjs/swagger/dist/services/swagger-types-mapper";
import { SwaggerCustomizationEntry, swaggerCustomizationEntries } from "./swagger-scanner";
import { IntelligentInMemoryCache } from "src/decorators/intelligent-in-memory-cache.decorator";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { JSONSerializable } from "src/type-utils";
import { WAREHOUSE_CLIENT } from "src/warehouse/warehouse.module";
import { STORE_CLIENT } from "src/store/store-client/store-client.module";

type SchemaItem = SchemaObject | ReferenceObject;
type SwaggerSchema = Record<string, SchemaItem>;

@Injectable()
@IntelligentInMemoryCache()
export class SwaggerService {

	storeSwaggerDoc?: OpenAPIObject;
	warehouseSwaggerDoc?: OpenAPIObject;

	constructor(
		@Inject(STORE_CLIENT) private storeClient: RestClientService<JSONSerializable>,
		@Inject(WAREHOUSE_CLIENT) private warehouseClient: RestClientService<JSONSerializable>,
	) {
		this.patchGlobalSchemaRefs = this.patchGlobalSchemaRefs.bind(this);
		this.patchRemoteRefs = this.patchRemoteRefs.bind(this);
		this.patchWarehouse = this.patchWarehouse.bind(this);
	}

	@Interval(CACHE_30_MIN)
	async warmup() {
		this.storeSwaggerDoc = await this.storeClient.get("documentation-json");
		this.warehouseSwaggerDoc = await this.warehouseClient.get("openapi-v3.json");
	}

	patch(document: OpenAPIObject) {
		if (!this.storeSwaggerDoc || !this.warehouseSwaggerDoc) {
			throw new Error("Remote swagger docs weren't loaded yet. Try again soon.");
		}

		return this.memoizedPatch(document);
	}

	// Length 0 to memoize the result regardless of the document equalness. It's identical always, just not the same instance.
	@IntelligentMemoize({ length: 0 })
	memoizedPatch(document: OpenAPIObject) {
		return pipe(document,
			this.patchGlobalSchemaRefs,
			this.patchWarehouse,
			this.patchRemoteRefs
		);
	}

	private patchGlobalSchemaRefs(document: OpenAPIObject) {
		document!.components!.schemas!.multiLang =
					(this.storeSwaggerDoc!.components!.schemas as Record<string, SchemaObject>).multiLang;
		return document;
	}

	private patchWarehouse(document: OpenAPIObject) {
		const warehouseSwaggerDoc = this.warehouseSwaggerDoc!;
		const warehousePaths = Object.keys(warehouseSwaggerDoc.paths).reduce((paths, p) => {
			const pathItem = warehouseSwaggerDoc.paths[p];
			for (const operationName of (["get", "put", "post", "delete"] as const)) {
				const operation = pathItem[operationName];
				if (!operation) {
					continue;
				}
				operation.security = [ { access_token: [] } ];
			}
			paths[`/warehouse${p}`] = pathItem;
			return paths;
		}, {} as PathsObject);
		document.paths = {
			...document.paths,
			...warehousePaths
		};
		document.components!.schemas = {
			...document.components!.schemas,
			...warehouseSwaggerDoc.components!.schemas
		};
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
		Object.keys(swaggerCustomizationEntries).forEach((path: string) => {
			const methods = swaggerCustomizationEntries[path];
			Object.keys(methods).forEach((methodName: string) => {
				const responseCodes = methods[methodName];
				Object.keys(responseCodes).forEach((responseCode: string) => {
					const entries = swaggerCustomizationEntries[path][methodName][responseCode];

					entries?.forEach(entry => {
						this.entrySideEffectForSchema(document!.components!.schemas!, entry);
						for (const iteratedPath of Object.keys(document.paths)) {
							const pathItem = document.paths[iteratedPath];
							for (const operationName of (["get", "put", "post", "delete"] as const)) {
								const operation = pathItem[operationName];
								if (!operation) {
									continue;
								}
								const existingSchema: SchemaObject | ReferenceObject | undefined
									= (operation.responses as any)[responseCode]?.content?.["application/json"]?.schema;
								if (
									iteratedPath !== `/${path}` && !iteratedPath.startsWith(`/${path}/`)
									|| operation?.operationId !== methodName
								) {
									continue;
								}

								const schema: SchemaItem | undefined = pipe(
									existingSchema,
									applyEntry(entry),
									paginateAsNeededWith(operation)
								);
								if (schema) {
									(operation.responses as any)[responseCode].content = {
										"application/json": { schema }
									};
								}
							}
						}
					});
				});
			});
		});
		return document;
	}

	entrySideEffectForSchema(schema: Record<string, SchemaObject | ReferenceObject>, entry: SwaggerCustomizationEntry) {
		if (isSwaggerRemoteRefEntry(entry)) {
			this.remoteRefEntrySideEffectForSchema(schema, entry);
		} else if (isSerializeEntry(entry)) {
			this.serializeEntrySideEffectsForSchema(schema, entry);
		}
	}

	remoteRefEntrySideEffectForSchema(schema: SwaggerSchema, entry: SwaggerRemoteRefEntry) {
		const remoteDoc = this.getRemoteSwaggerDoc(entry);
		const remoteSchemas = (remoteDoc!.components!.schemas as Record<string, SchemaObject>);
		schema![entry.ref] = remoteSchemas[entry.ref];
	}

	serializeEntrySideEffectsForSchema(schema: SwaggerSchema, entry: SerializeEntry) {
		if (entry.schemaDefinitionName) {
			const jsonSchema = getJsonSchema(entry.serializeInto);
			if (entryHasWhiteList(entry)) {
				whitelistKeys((jsonSchema.properties as any), entry.serializeOptions.whitelist);
			}
			schema![entry.schemaDefinitionName] = jsonSchema;
		}
	}

	private getRemoteSwaggerDoc(entry: SwaggerRemoteRefEntry) {
		switch (entry.source) {
		case "store":
			return this.storeSwaggerDoc;
		}
	}
}

// Taken from https://github.com/nestjs/swagger/issues/2306
function getJsonSchema(targetConstructor: Type<unknown>) {
	const factory = new SchemaObjectFactory(new ModelPropertiesAccessor(), new SwaggerTypesMapper());

	const schemas: Record<string, SchemaObject> = {};
	factory.exploreModelSchema(targetConstructor, schemas);

	return schemas[targetConstructor.name];
}


const applyEntry = (entry: SwaggerCustomizationEntry) => (schema?: SchemaItem): SchemaItem | undefined => {
	if (isSwaggerRemoteRefEntry(entry)) {
		return replaceWithRemote(entry);
	} else if (isSerializeEntry(entry)) {
		return replaceWithSerialized(entry, schema);
	}
	return schema;
};

const replaceWithRemote = (entry: SwaggerRemoteRefEntry) => (
	{ "$ref": `#/components/schemas/${entry.ref}` }
);

const replaceWithSerialized = (entry: SerializeEntry, schema?: SchemaItem) => (
	entry.schemaDefinitionName
		? { "$ref": `#/components/schemas/${entry.schemaDefinitionName}` }
		: schema
);

const isPagedOperation = (operation: OperationObject): boolean => {
	for (const param of (operation.parameters || [])) {
		if ((param as ParameterObject).name === "page") {
			return true;
		}
	}
	return false;
};

const asPagedResponse = (schema: SchemaItem): SchemaObject => ({
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

const isSchemaObject = (schema: SchemaItem): schema is SchemaObject => !!(schema as any).type;

const isPagedSchema = (schema: SchemaItem) =>
	isSchemaObject(schema) && schema.type === "object" && schema.properties?.page;

const paginateAsNeededWith = (operation: OperationObject) =>
	(schema?: SchemaObject | ReferenceObject) =>
		(schema && isPagedOperation(operation) && !isPagedSchema(schema))
			? asPagedResponse(schema)
			: schema;
