import { Inject, Injectable, Logger, Type } from "@nestjs/common";
import { OpenAPIObject } from "@nestjs/swagger";
import { RestClientService } from "src/rest-client/rest-client.service";
import { CACHE_30_MIN, lastFromNonEmptyArr, parseJSONPointer, parseURIFragmentIdentifierRepresentation, pipe,
	updateWithJSONPointer, whitelistKeys } from "src/utils";
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
import { JSONSerializable, Newable, isObject } from "src/typing.utils";
import { GLOBAL_CLIENT, STORE_CLIENT } from "src/provider-tokens";
import { ModuleRef } from "@nestjs/core";
import { FetchSwagger, PatchSwagger, RemoteSwaggerEntry, instancesWithRemoteSwagger }
	from "src/decorators/remote-swagger-merge.decorator";
import { ConfigService } from "@nestjs/config";
import { JSONSchema } from "src/json-schema.utils";
import { HTTP_CODE_METADATA } from "@nestjs/common/constants";
export type SchemaItem = SchemaObject | ReferenceObject;
type SwaggerSchema = Record<string, SchemaItem>;

@Injectable()
@IntelligentInMemoryCache()
export class SwaggerService {

	private logger = new Logger(SwaggerService.name);

	storeSwaggerDoc?: OpenAPIObject;
	lajiBackendSwaggerDoc?: OpenAPIObject;
	remoteSwaggers: Record<string, {
		instance: {
			fetchSwagger: FetchSwagger,
			patchSwagger: PatchSwagger
		},
		document?: OpenAPIObject
	}> = {};

	constructor(
		@Inject(STORE_CLIENT) private storeClient: RestClientService<JSONSerializable>,
		@Inject(GLOBAL_CLIENT) private globalClient: RestClientService<JSONSerializable>,
		private config: ConfigService,
		private moduleRef: ModuleRef
	) {
		this.patchRemoteRefs = this.patchRemoteRefs.bind(this);
		this.patchRemoteSwaggers = this.patchRemoteSwaggers.bind(this);
		this.fetchRemoteSwagger = this.fetchRemoteSwagger.bind(this);
		this.patchMultiLangs = this.patchMultiLangs.bind(this);
	}

	@Interval(CACHE_30_MIN)
	async warmup() {
		this.storeSwaggerDoc = await this.getStoreSwaggerDoc();
		this.lajiBackendSwaggerDoc = await this.getLajiBackendSwaggerDoc();
		await Promise.all(instancesWithRemoteSwagger.map(this.fetchRemoteSwagger));
	}

	getStoreSwaggerDoc() {
		return this.storeClient.get<OpenAPIObject>("documentation-json", undefined, { cache: true });
	}

	getLajiBackendSwaggerDoc() {
		return this.globalClient.get<OpenAPIObject>(`${this.config.get("LAJI_BACKEND_HOST")}/openapi-v3.json`);
	}

	/** Assumes that remote sources are already loaded. */
	private getRemoteSwaggerDocSync(entry: SwaggerRemoteRefEntry): OpenAPIObject {
		switch (entry.source) {
		case "store":
			return this.storeSwaggerDoc!;
		case "laji-backend":
			return this.lajiBackendSwaggerDoc!;
		}
	}

	getRemoteSwaggerDoc(entry: SwaggerRemoteRefEntry): Promise<OpenAPIObject> {
		switch (entry.source) {
		case "store":
			return this.getStoreSwaggerDoc();
		case "laji-backend":
			return this.getLajiBackendSwaggerDoc();
		}
	}

	private async fetchRemoteSwagger(entry: RemoteSwaggerEntry) {
		this.remoteSwaggers[entry.name] = { instance: entry.instance };
		const controller = this.moduleRef.get(entry.instance, { strict: false });
		try {
			this.remoteSwaggers[entry.name]!.document = await controller.fetchSwagger();
		} catch (e) {
			this.logger.error("Failed to fetch remote swagger. Our swagger document is broken!", { entry });
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
	private memoizedPatch(document: OpenAPIObject) {
		return pipe(
			this.patchRemoteSwaggers,
			this.patchRemoteRefs,
			this.patchMultiLangs
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
	 * 2. Fixes response pagination globally according to query parameters
	 *
	 * Patching is performed mutably.
	 */
	private patchRemoteRefs(document: OpenAPIObject) {
		Object.keys(swaggerCustomizationEntries).forEach((path: string) => {
			const methods = swaggerCustomizationEntries[path]!;
			Object.keys(methods).forEach((methodName: string) => {
				const entries = swaggerCustomizationEntries[path]![methodName]!;

				entries?.forEach(entry => {
					this.entrySideEffectForSchema(document!.components!.schemas!, entry);
					for (const iteratedPath of Object.keys(document.paths)) {
						const pathItem = document.paths[iteratedPath]!;
						for (const httpMethod of (["get", "put", "post", "delete"] as const)) {
							const operation = pathItem[httpMethod];

							if (
								!operation
								|| iteratedPath !== `/${path}` && !iteratedPath.startsWith(`/${path}/`)
								|| operation.operationId !== `${entry.controller}_${methodName}`
							) {
								continue;
							}

							if (entry.applyToResponse !== false) {
								const responseCode = deduceResponseCode(
									operation,
									httpMethod,
									methodName,
									entry.instance
								);
								const existingSchema = getOperationResponseCodeSchemaOrCreateIfNotExists(
									operation,
									httpMethod,
									methodName,
									entry.instance);
								const schema: SchemaItem = pipe(
									applyEntryToResponse(entry, document),
									paginateAsNeededWith(operation)
								)(existingSchema);
								(operation.responses as any)[responseCode].content = {
									"application/json": { schema }
								};
							}

							if (["post", "put"].includes(httpMethod)) {
								let schema: SchemaItem | undefined = isSwaggerRemoteRefEntry(entry)
									? { "$ref": `#/components/schemas/${entry.ref}` }
									: (operation.requestBody as any)!.content["application/json"].schema;
								if (entry.customizeRequestBodySchema) {
									schema = entry.customizeRequestBodySchema(
										schema,
										document,
										isSwaggerRemoteRefEntry(entry) ? this.getRemoteSwaggerDocSync(entry) : undefined
									);
								}
								operation.requestBody = {
									required: true,
									...(operation.requestBody || {}),
									content: {
										"application/json": { schema }
									}
								};
							}
						}
					}
				});
			});
		});
		return document;
	}

	private patchMultiLangs(document: OpenAPIObject) {
		Object.keys(document.components!.schemas!).forEach(key => {
			document.components!.schemas![key] = multiLangAsString(document.components!.schemas![key]!);
		});
		return document;
	}

	private entrySideEffectForSchema(schema: Record<string, SchemaItem>, entry: SwaggerCustomizationEntry) {
		if (isSwaggerRemoteRefEntry(entry)) {
			this.remoteRefEntrySideEffectForSchema(schema, entry);
		} else if (isSerializeEntry(entry)) {
			this.serializeEntrySideEffectForSchema(schema, entry);
		}
	}

	private remoteRefEntrySideEffectForSchema(schema: SwaggerSchema, entry: SwaggerRemoteRefEntry) {
		const remoteDoc = this.getRemoteSwaggerDocSync(entry);
		const remoteSchemas = (remoteDoc.components!.schemas as Record<string, SchemaObject>);
		if (!entry.ref) {
			return;
		}
		const remoteSchema = remoteSchemas[entry.ref];
		if (!remoteSchema) {
			throw new Error(`Badly configured SwaggerRemoteRef. Remote schema didn't contain the ref ${entry.ref}`);
		}
		schema[entry.schemaDefinitionName || entry.ref] = remoteSchema;
		this.mergeReferencedRefsFromRemote(schema, entry, remoteSchema);
	}

	private serializeEntrySideEffectForSchema(
		schema: SwaggerSchema, entry: SerializeEntry
	) {
		const jsonSchema = getJsonSchema(entry.serializeInto);
		if (entryHasWhiteList(entry)) {
			whitelistKeys((jsonSchema.properties as any), entry.serializeOptions.whitelist);
			if (!entry.schemaDefinitionName) {
				throw new Error("An entry with 'whitelist' should also have a 'schemaDefinitionName'");
			}
			if (entry.schemaDefinitionName) {
				schema[entry.schemaDefinitionName] = jsonSchema;
			}
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
					iteratedRemoteSchema.anyOf.forEach(traverseAndMerge);
				} else if (iteratedRemoteSchema.oneOf) {
					iteratedRemoteSchema.oneOf.forEach(traverseAndMerge);
				}
			} else {
				const { $ref: ref } = iteratedRemoteSchema;
				const referencedSchemaRefName = lastFromNonEmptyArr(ref.split("/"));
				if (!schema[referencedSchemaRefName]) {
					const referencedSchema = parseURIFragmentIdentifierRepresentation<SchemaObject>(
						this.getRemoteSwaggerDocSync(entry), ref
					);
					schema[referencedSchemaRefName] = referencedSchema;
					traverseAndMerge(referencedSchema);
				}
			}
		};

		traverseAndMerge(referencedRemoteSchema);
	}

	async getSchemaForEntry(entry: SwaggerRemoteRefEntry) {
		const remoteSwagger = await this.getRemoteSwaggerDoc(entry);
		return parseJSONPointer<JSONSchema>(
			remoteSwagger,
			`/components/schemas/${entry.ref}`
		);
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

const getSchemaDefinition = (document: OpenAPIObject, schema: SchemaObject | ReferenceObject): SchemaObject =>
	"$ref" in schema
		? parseURIFragmentIdentifierRepresentation(document, (schema as any).$ref)
		: schema;

const hasSchemaDefinitionName = (entry: unknown): entry is { schemaDefinitionName: string } =>
	isObject(entry) && !!entry.schemaDefinitionName;

const applyEntryToResponse = (entry: SwaggerCustomizationEntry, document: OpenAPIObject) =>
	(schema: SchemaItem): SchemaItem => {
		if (isSwaggerRemoteRefEntry(entry)) {
			schema = replaceWithRemote(entry, schema, document);
		}
		if (hasSchemaDefinitionName(entry)) {
			schema = replaceWithRefToCustomSchemaDefinitionName(entry, schema);
		}
		if (entry.customizeResponseSchema) {
			schema = entry.customizeResponseSchema(schema, document);
		}
		return schema;
	};

const replaceWithRemote = (entry: SwaggerRemoteRefEntry, schema: SchemaItem, document: OpenAPIObject) => {
	const replacement = { "$ref": `#/components/schemas/${entry.ref}` };
	if (entry.replacePointer) {
		const schemaDef = getSchemaDefinition(document, schema);
		updateWithJSONPointer(schemaDef, entry.replacePointer, replacement);
		return schemaDef;
	} else {
		return replacement;
	}
};

const replaceWithRefToCustomSchemaDefinitionName = (entry: { schemaDefinitionName: string }, schema: SchemaItem) => (
	entry.schemaDefinitionName
		? { "$ref": `#/components/schemas/${entry.schemaDefinitionName}` }
		: schema
);

export const isPagedOperation = (operation: OperationObject) =>
	(operation.parameters || []).some(param => (param as ParameterObject).name === "page") || false;

const asPagedResponse = (schema: SchemaItem): SchemaObject => ({
	type: "object",
	properties: {
		currentPage: { type: "number" },
		pageSize: { type: "number" },
		total: { type: "number" },
		lastPage: { type: "number" },
		prevPage: { type: "number" },
		nextPage: { type: "number" },
		results: { type: "array", items: schema },
	},
	required: [ "currentPage", "pageSize", "total", "lastPage", "results"]
});

export const isSchemaObject = (schema: SchemaItem): schema is SchemaObject =>
	!!(schema as any).type
		|| !!(schema as any).anyOf
		|| !!(schema as any).oneOf;

export const isPagedSchema = (schema: SchemaItem) =>
	isSchemaObject(schema) && schema.type === "object" && schema.properties?.page;

export const paginateAsNeededWith = (operation: OperationObject) =>
	(schema: SchemaObject | ReferenceObject) =>
		(isPagedOperation(operation) && !isPagedSchema(schema))
			? asPagedResponse(schema)
			: schema;

const multiLangAsString = <T extends SchemaObject | ReferenceObject>(schema: T): T | { type: "string" } => {
	if (isSchemaObject(schema) && schema.properties && (schema as any)._patchMultiLang !== false) {
		if (["fi", "sv", "en"].every(lang => Object.keys(schema.properties!).includes(lang))) {
			return { type: "string" };
		} else {
			Object.keys(schema.properties).forEach(property => {
				schema.properties![property] = multiLangAsString(schema.properties![property]!);
			});
			return schema;
		}
	} else if (!isSchemaObject(schema) && schema.$ref === "#/components/schemas/multiLang") {
		return { type: "string" };
	}
	return schema;
};

const deduceResponseCode = (
	operation: OperationObject,
	httpMethod: string,
	methodName: string, instance: Newable<unknown>
) => {
	const manuallySelected = Reflect.getMetadata(HTTP_CODE_METADATA, (instance as any).prototype[methodName]);
	if (manuallySelected) {
		return manuallySelected;
	}
	for (const code of [201, 200]) {
		const jsonPointer = `/responses/${code}/content/application~1json/schema`;
		const maybeExistingSchema = parseJSONPointer<SchemaItem | undefined>(operation, jsonPointer, { safely: true });
		if (maybeExistingSchema) {
			return code;
		}
	}
	return httpMethod === "post" ? 201 : 200;
};

export const getOperationResponseCodeSchemaOrCreateIfNotExists = (
	operation: OperationObject,
	httpMethod: string,
	methodName: string,
	instance: Newable<unknown>
)
	: SchemaItem =>
{
	const responseCode = deduceResponseCode(operation, httpMethod, methodName, instance);
	const jsonPointer = `/responses/${responseCode}/content/application~1json/schema`;
	const existingSchema = parseJSONPointer<SchemaItem | undefined>(operation, jsonPointer, { safely: true });
	if (existingSchema) {
		return existingSchema;
	}
	updateWithJSONPointer(operation, jsonPointer, {}, { create: true });
	return parseJSONPointer<SchemaItem>(operation, jsonPointer);
};
