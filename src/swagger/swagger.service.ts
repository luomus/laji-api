import { Inject, Injectable, Logger, Type } from "@nestjs/common";
import { OpenAPIObject } from "@nestjs/swagger";
import { RestClientService } from "src/rest-client/rest-client.service";
import { CACHE_30_MIN, lastFromNonEmptyArr, parseURIFragmentIdentifierRepresentation, pipe, updateWithJSONPointer,
	whitelistKeys } from "src/utils";
import { OperationObject, ParameterObject, ReferenceObject, SchemaObject }
	from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { SwaggerRemoteRefEntry, isSwaggerRemoteRefEntry } from "./swagger-remote.decorator";
import { Interval } from "@nestjs/schedule";
import { SerializeEntry, entryHasWhiteList, isSerializeEntry } from "src/serialization/serialize.decorator";
import { SchemaObjectFactory } from "@nestjs/swagger/dist/services/schema-object-factory";
import { ModelPropertiesAccessor } from "@nestjs/swagger/dist/services/model-properties-accessor";
import { SwaggerTypesMapper } from "@nestjs/swagger/dist/services/swagger-types-mapper";
import { SwaggerCustomizationEntry, swaggerCustomizationEntries } from "./swagger-scanner";
import { IntelligentInMemoryCache } from "src/decorators/intelligent-in-memory-cache.decorator";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { JSONSerializable } from "src/typing.utils";
import { STORE_CLIENT } from "src/provider-tokens";
import { ModuleRef } from "@nestjs/core";
import {
	FetchSwagger, PatchSwagger, instancesWithRemoteSwagger
} from "src/decorators/remote-swagger-merge.decorator";

type SchemaItem = SchemaObject | ReferenceObject;
type SwaggerSchema = Record<string, SchemaItem>;

@Injectable()
@IntelligentInMemoryCache()
export class SwaggerService {

	private logger = new Logger(SwaggerService.name);

	storeSwaggerDoc?: OpenAPIObject;
	remoteSwaggers: Record<string, {
		instance: {
			fetchSwagger: FetchSwagger,
			patchSwagger: PatchSwagger

		},
		document?: OpenAPIObject
	}> = {};

	constructor(
		@Inject(STORE_CLIENT) private storeClient: RestClientService<JSONSerializable>,
		private moduleRef: ModuleRef
	) {
		this.patchRemoteRefs = this.patchRemoteRefs.bind(this);
		this.patchRemoteSwaggers = this.patchRemoteSwaggers.bind(this);
	}

	@Interval(CACHE_30_MIN)
	async warmup() {
		this.storeSwaggerDoc = await this.storeClient.get("documentation-json");
		for (const entry of instancesWithRemoteSwagger) {
			this.remoteSwaggers[entry.name] = { instance: entry.instance };
			const controller = this.moduleRef.get(entry.instance, { strict: false });
			try {
				this.remoteSwaggers[entry.name]!.document = await controller.fetchSwagger();
			} catch (e) {
				this.logger.error("Failed to fetch remote swagger. Our swagger document is broken!", { entry });
			}
		}
	}

	patch(document: OpenAPIObject) {
		if (Object.values(this.remoteSwaggers).some(({ document }) => !document)) {
			throw new Error("Remote swagger docs weren't loaded yet. Try again soon.");
		}
		return this.memoizedPatch(document);
	}

	// `length` 0 to memoize the result regardless of the document equalness. It's identical always, just not the same instance.
	@IntelligentMemoize({ length: 0 })
	memoizedPatch(document: OpenAPIObject) {
		return pipe(
			this.patchRemoteSwaggers,
			this.patchRemoteRefs
		)(document);
	}

	/** Patches the Swagger document with controllers decorated with `@ProxyWithSwaggerMerge()` */
	private patchRemoteSwaggers(document: OpenAPIObject) {
		return Object.values(this.remoteSwaggers).reduce(
			(patchedDocument, { instance, document }) =>
				((instance as any).patchSwagger || (instance as any).prototype.patchSwagger)
					.call(instance, patchedDocument, document!),
			document
		);
	}

	/**
	 * Iterates through the whole OpenAPIObject tree and patches it by:
	 * 1. replaces remote entries defined by `@SwaggerRemoteRef()` decorator
	 * 2. Fixes response pagination globally
	 *
	 * Patching is performed mutably.
	 */
	private patchRemoteRefs(document: OpenAPIObject) {
		Object.keys(swaggerCustomizationEntries).forEach((path: string) => {
			const methods = swaggerCustomizationEntries[path]!;
			Object.keys(methods).forEach((methodName: string) => {
				const responseCodes = methods[methodName]!;
				Object.keys(responseCodes).forEach((responseCode: string) => {
					const entries = swaggerCustomizationEntries[path]![methodName]![responseCode]!;

					entries?.forEach(entry => {
						this.entrySideEffectForSchema(document!.components!.schemas!, entry);
						for (const iteratedPath of Object.keys(document.paths)) {
							const pathItem = document.paths[iteratedPath]!;
							for (const operationName of (["get", "put", "post", "delete"] as const)) {
								const operation = pathItem[operationName];
								if (!operation) {
									continue;
								}
								const existingSchema: SchemaObject | ReferenceObject | undefined
									= (operation.responses as any)[responseCode]?.content?.["application/json"]?.schema;
								if (
									iteratedPath !== `/${path}` && !iteratedPath.startsWith(`/${path}/`)
									|| operation?.operationId !== `${entry.controller}_${methodName}`
								) {
									continue;
								}

								if (!existingSchema) {
									continue;
								}

								const schema: SchemaItem | undefined = pipe(
									applyEntry(entry, document),
									paginateAsNeededWith(operation)
								)(existingSchema);
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
		const remoteSchemas = (remoteDoc.components!.schemas as Record<string, SchemaObject>);
		const remoteSchema = remoteSchemas[entry.ref];
		if (!remoteSchema) {
			throw new Error(`Badly configured SwaggerRemoteRef. Remote schema didn't contain the ref ${entry.ref}`);
		}
		schema[entry.ref] = remoteSchema;
		this.mergeReferencedRefsFromRemote(schema, entry, remoteSchema);
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

	/** Assumes that remote sources are already loaded. */
	private getRemoteSwaggerDoc(entry: SwaggerRemoteRefEntry): OpenAPIObject {
		switch (entry.source) {
		case "store":
			return this.storeSwaggerDoc!;
		}
	}

	/**
	 * A remote ref might have references to the remote document's schema. This method finds those and merges them to our
	 * patched document.
	 * */
	private mergeReferencedRefsFromRemote(
		schema: SwaggerSchema,
		entry: SwaggerRemoteRefEntry,
		referencedRemoteSchema: SchemaObject
	) {
		const traverseAndMerge = (iteratedRemoteSchema: SchemaObject | ReferenceObject) => {
			if (isSchemaObject(iteratedRemoteSchema)) {
				if (iteratedRemoteSchema.items) {
					traverseAndMerge(iteratedRemoteSchema.items!);
				} else if (iteratedRemoteSchema.properties) {
					for (const key of Object.keys(iteratedRemoteSchema.properties)) {
						if (!iteratedRemoteSchema.properties![key]) {
							continue;
						}
						traverseAndMerge(iteratedRemoteSchema.properties![key]!);
					}
				} else if (iteratedRemoteSchema.anyOf) {
					iteratedRemoteSchema.anyOf.forEach(subSchema => traverseAndMerge(subSchema));
				} else if (iteratedRemoteSchema.oneOf) {
					iteratedRemoteSchema.oneOf.forEach(subSchema => traverseAndMerge(subSchema));
				}
			} else {
				const { $ref: ref } = iteratedRemoteSchema;
				const referencedSchemaRefName = lastFromNonEmptyArr(ref.split("/"));
				if (!schema[referencedSchemaRefName]) {
					const referencedSchema = parseURIFragmentIdentifierRepresentation<SchemaObject>(
						this.getRemoteSwaggerDoc(entry), ref
					);
					schema[referencedSchemaRefName] = referencedSchema;
					traverseAndMerge(referencedSchema);
				}
			}
		};

		traverseAndMerge(referencedRemoteSchema);
	}
}

// Taken from https://github.com/nestjs/swagger/issues/2306
function getJsonSchema(targetConstructor: Type<unknown>) {
	const factory = new SchemaObjectFactory(new ModelPropertiesAccessor(), new SwaggerTypesMapper());

	const schemas: Record<string, SchemaObject> = {};
	factory.exploreModelSchema(targetConstructor, schemas);

	const schema = schemas[targetConstructor.name];
	if (!schema) {
		throw new Error(`Failed to get model JSON Schema for ${targetConstructor.name}`);
	}
	return schema;
}

const getSchemaDefinition = (document: OpenAPIObject, schema: SchemaObject | ReferenceObject): SchemaObject => {
	if ("$ref" in schema) {
		return parseURIFragmentIdentifierRepresentation(document, (schema as any).$ref);
	} else {
		return schema;
	}
};

const applyEntry = (entry: SwaggerCustomizationEntry, document: OpenAPIObject) =>
	(schema: SchemaItem): SchemaItem | undefined => {
		if (isSwaggerRemoteRefEntry(entry)) {
			return replaceWithRemote(entry, schema, document);
		} else if (isSerializeEntry(entry)) {
			return replaceWithSerialized(entry, schema);
		}
		return schema;
	};

const replaceWithRemote = (entry: SwaggerRemoteRefEntry, schema: SchemaItem, document: OpenAPIObject) => {
	const replacement = { "$ref": `#/components/schemas/${entry.ref}` };
	if (entry.replacePointer) {
		const schemaDef = getSchemaDefinition(document, schema);
		updateWithJSONPointer(schemaDef, entry.replacePointer, replacement);
	} else {
		return replacement;
	}
};

const replaceWithSerialized = (entry: SerializeEntry, schema?: SchemaItem) => (
	entry.schemaDefinitionName
		? { "$ref": `#/components/schemas/${entry.schemaDefinitionName}` }
		: schema
);

export const isPagedOperation = (operation: OperationObject) =>
	(operation.parameters || []).some(param => (param as ParameterObject).name === "page") || false;

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

const isSchemaObject = (schema: SchemaItem): schema is SchemaObject =>
	!!(schema as any).type
	|| !!(schema as any).anyOf
	|| !!(schema as any).oneOf;

export const isPagedSchema = (schema: SchemaItem) =>
	isSchemaObject(schema) && schema.type === "object" && schema.properties?.page;

export const paginateAsNeededWith = (operation: OperationObject) =>
	(schema?: SchemaObject | ReferenceObject) =>
		(schema && isPagedOperation(operation) && !isPagedSchema(schema))
			? asPagedResponse(schema)
			: schema;
