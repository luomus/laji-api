import { Inject, Injectable, Logger, RequestMethod, Type } from "@nestjs/common";
import { OpenAPIObject } from "@nestjs/swagger";
import { RestClientService } from "src/rest-client/rest-client.service";
import { CACHE_30_MIN, lastFromNonEmptyArr, parseJSONPointer, parseURIFragmentIdentifierRepresentation, promisePipe,
	updateWithJSONPointer, whitelistKeys } from "src/utils";
import { OperationObject, ParameterObject, ReferenceObject, SchemaObject }
	from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { SwaggerRemoteEntry, isSwaggerRemoteEntry, isSwaggerRemoteRefEntry } from "./swagger-remote.decorator";
import { Interval } from "@nestjs/schedule";
import { SerializeEntry, entryHasWhiteList, isSerializeEntry } from "src/serialization/serialize.decorator";
import { SchemaObjectFactory } from "@nestjs/swagger/dist/services/schema-object-factory";
import { ModelPropertiesAccessor } from "@nestjs/swagger/dist/services/model-properties-accessor";
import { SwaggerTypesMapper } from "@nestjs/swagger/dist/services/swagger-types-mapper";
import { SwaggerCustomizationEntry, swaggerCustomizationEntries } from "./swagger-scanner";
import { IntelligentInMemoryCache } from "src/decorators/intelligent-in-memory-cache.decorator";
import { JSONSerializable, Newable, WithNonNullableKeys, isObject } from "src/typing.utils";
import { GLOBAL_CLIENT, STORE_CLIENT } from "src/provider-tokens";
import { ModuleRef } from "@nestjs/core";
import { FetchSwagger, PatchSwagger, RemoteSwaggerEntry, fixRefsModelPrefix, instancesWithRemoteSwagger }
	from "src/decorators/remote-swagger-merge.decorator";
import { ConfigService } from "@nestjs/config";
import { JSONSchema } from "src/json-schema.utils";
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { RequestPersonDecoratorConfig, personTokenMethods } from "src/decorators/request-person.decorator";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
export type SchemaItem = SchemaObject | ReferenceObject;
type SwaggerSchema = Record<string, SchemaItem>;

@Injectable()
@IntelligentInMemoryCache()
export class SwaggerService {

	private logger = new Logger(SwaggerService.name);
	private rawDocument: OpenAPIObject;

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
		this.patchPersonToken = this.patchPersonToken.bind(this);
		this.getStoreSwaggerDoc = this.getStoreSwaggerDoc.bind(this);
		this.getLajiBackendSwaggerDoc = this.getLajiBackendSwaggerDoc.bind(this);
	}

	@Interval(CACHE_30_MIN)
	async warmup() {
		await this.getStoreSwaggerDoc();
		await this.getLajiBackendSwaggerDoc();
		await Promise.all(instancesWithRemoteSwagger.map(this.fetchRemoteSwagger));
	}

	async getStoreSwaggerDoc() {
		return this.storeClient.get<OpenAPIObject>("documentation-json", undefined, { cache: CACHE_30_MIN });
	}

	getLajiBackendSwaggerDoc() {
		return this.globalClient.get<OpenAPIObject>(
			`${this.config.get("LAJI_BACKEND_HOST")}/openapi-v3.json`,
			undefined,
			{ cache: CACHE_30_MIN }
		);
	}

	async getRemoteSwaggerDoc(entry: SwaggerRemoteEntry): Promise<{ document: OpenAPIObject, prefix: string }> {
		switch (entry.source) {
		case "store":
			return { document: await this.getStoreSwaggerDoc(), prefix: "store-" };
		case "laji-backend":
			return { document: await this.getLajiBackendSwaggerDoc(), prefix: "LajiBackend" };
		}
	}

	private async fetchRemoteSwagger(entry: RemoteSwaggerEntry) {
		this.remoteSwaggers[entry.name] = { instance: entry.instance };
		const controller = this.moduleRef.get(entry.instance, { strict: false });
		try {
			this.remoteSwaggers[entry.name]!.document = await controller.fetchSwagger();
		} catch (e) {
			this.logger.fatal("Failed to fetch remote swagger. Our swagger document is broken!", { entry });
		}
	}

	getRawDocument() {
		return this.rawDocument;
	}

	patchMutably(document: OpenAPIObject) {
		this.rawDocument = document;
		return promisePipe(
			this.patchRemoteSwaggers,
			this.patchRemoteRefs,
			this.patchMultiLangs,
			this.patchPersonToken
		)(JSON.parse(JSON.stringify(document)));
	}

	/** Patches the Swagger document with controllers decorated with `@RemoteSwaggerMerge()` */
	private patchRemoteSwaggers(document: OpenAPIObject) {
		return Object.values(this.remoteSwaggers).reduce(
			(patchedDocument, entry) => {
				if (!entry.document) {
					return patchedDocument;
				}
				return ((entry.instance as any).patchSwagger || (entry.instance as any).prototype.patchSwagger)
					.call(entry.instance, patchedDocument, entry.document!);
			},
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
	private async patchRemoteRefs(document: OpenAPIObject) {
		for (const path of Object.keys(swaggerCustomizationEntries)) {
			const methods = swaggerCustomizationEntries[path]!;
			for (const methodName of Object.keys(methods)) {
				const entries = swaggerCustomizationEntries[path]![methodName]!;

				for (const entry of entries) {
					await this.entrySideEffectForSchema(document!.components!.schemas!, entry);
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
								await this.patchResponseSchema(operation, httpMethod, methodName, entry, document);
							}

							if (["post", "put"].includes(httpMethod) && entry.applyToRequest !== false) {
								await this.patchRequestSchema(operation, entry, document);
							}
						}
					}
				}
			}
		}
		return document;
	}

	async patchResponseSchema(
		operation: OperationObject,
		httpMethod: "get" | "put" | "post" | "delete",
		methodName: string,
		entry: SwaggerCustomizationEntry,
		document: OpenAPIObject
	) {
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
		const schema: SchemaItem = await promisePipe(
			this.applyEntryToResponse(entry, document),
			paginateAsNeededWith(operation)
		)(existingSchema);
		(operation.responses as any)[responseCode].content = {
			"application/json": { schema }
		};
	}

	async patchRequestSchema(operation: OperationObject, entry: SwaggerCustomizationEntry, document: OpenAPIObject) {
		let schema: SchemaItem | undefined = isSwaggerRemoteEntry(entry)
			? { "$ref": `#/components/schemas${entry.ref}` }
			: (operation.requestBody as any)!.content["application/json"].schema;
		if (entry.customizeRequestBodySchema) {
			schema = entry.customizeRequestBodySchema(
				schema,
				document,
				isSwaggerRemoteEntry(entry)
					? (await this.getRemoteSwaggerDoc(entry)).document
					: undefined
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

	applyEntryToResponse(entry: SwaggerCustomizationEntry, document: OpenAPIObject) {
		return async (schema: SchemaItem): Promise<SchemaItem> => {
			if (isSwaggerRemoteRefEntry(entry)) {
				schema = await this.replaceWithRemote(entry, schema, document);
			}
			if (hasSwaggerSchemaDefinitionName(entry)) {
				schema = replaceWithRefToCustomSwaggerSchemaDefinitionName(entry, schema);
			}
			if (entry.customizeResponseSchema) {
				schema = entry.customizeResponseSchema(schema, document);
			}
			return schema;
		};
	}

	async replaceWithRemote(
		entry: WithNonNullableKeys<SwaggerRemoteEntry, "ref">,
		schema: SchemaItem,
		document: OpenAPIObject
	) {
		const { prefix } = await this.getRemoteSwaggerDoc(entry);
		const refParts = entry.ref.split("/");
		const firstRefParts = refParts;
		const lastRefPart = firstRefParts.pop();
		const prefixedRef = [...firstRefParts, prefix + lastRefPart].join("/");
		const replacement = { "$ref": `#/components/schemas${prefixedRef}` };
		if (entry.replacePointer) {
			const schemaDef = getSchemaDefinition(document, schema);
			updateWithJSONPointer(schemaDef, entry.replacePointer, replacement);
			return schemaDef;
		} else {
			return replacement;
		}
	}

	private patchMultiLangs(document: OpenAPIObject) {
		Object.keys(document.components!.schemas!).forEach(key => {
			document.components!.schemas![key] = multiLangAsString(document.components!.schemas![key]!);
		});
		return document;
	}

	private patchPersonToken(document: OpenAPIObject) {
		const map = personTokenMethods.reduce((map, {
			controllerClass,
			controllerClassMethod,
			personTokenConfig
		}) => {
			const isExcluded = Reflect.getMetadata(
				DECORATORS.API_EXCLUDE_ENDPOINT,
				controllerClassMethod,
			);
			if (isExcluded) {
				return map;
			}

			const controllerPath = Reflect.getMetadata(PATH_METADATA, controllerClass) as string;
			const methodPath = Reflect.getMetadata(PATH_METADATA, controllerClassMethod) as string;

			const path = `/${controllerPath}/${methodPath.replace(/^\//, "").replace(/:([^/]+)/g, "{$1}")}`
				.replace(/\/$/, "");
			const httpMethod = Reflect.getMetadata(METHOD_METADATA, controllerClassMethod) as number;
			map[path] = { ...map[path], [RequestMethod[httpMethod]!.toLowerCase()]: personTokenConfig };
			return map;
		}, {} as Record<string, Record<string, RequestPersonDecoratorConfig>>);

		Object.keys(document.paths).forEach(path => {
			Object.keys(document.paths[path]!).forEach((method: "get" | "post" | "put" | "delete") => {
				const personTokenConfig = map[path]?.[method];
				if (personTokenConfig) { // Apply @RequestPerson() decorator to our swagger.
					if (!document.paths[path]![method]!.parameters) {
						document.paths[path]![method]!.parameters = [];
					}
					const description = personTokenConfig.description || ("Person's authentication token" + (
						personTokenConfig.required !== false
							?  ". It is required."
							: ""
					));
					(document as any).paths[path][method].parameters.push({
						name: "Person-Token",
						required: false,
						description,
						in: "header",
						schema: { type: "string" }
					});
				} else { // Fix remote swaggers that have person token in query params.
					const { parameters } = document.paths[path]![method]!;
					if (!parameters) {
						return;
					}

					parameters.forEach((param: ParameterObject) => {
						if (param.name === "personToken" && param.in === "query") {
							param.name = "Person-Token";
							param.in = "header";
						}
					});
				}
			});
		});
		return document;
	}


	private async entrySideEffectForSchema(schema: Record<string, SchemaItem>, entry: SwaggerCustomizationEntry) {
		if (isSwaggerRemoteRefEntry(entry)) {
			await this.remoteRefEntrySideEffectForSchema(schema, entry);
		} else if (isSerializeEntry(entry)) {
			this.serializeEntrySideEffectForSchema(schema, entry);
		}
	}

	private async remoteRefEntrySideEffectForSchema(schema: SwaggerSchema, entry: SwaggerRemoteEntry) {
		const { document: remoteDoc, prefix } = await this.getRemoteSwaggerDoc(entry);
		const remoteSchemas = (remoteDoc.components!.schemas as Record<string, SchemaObject>);
		if (!entry.ref) {
			return;
		}
		const remoteSchema = parseJSONPointer(remoteSchemas, entry.ref);
		if (!remoteSchema) {
			throw new Error(`Badly configured SwaggerRemoteRef. Remote schema didn't contain the ref ${entry.ref}`);
		}
		const name = entry.swaggerSchemaDefinitionName || (prefix + lastFromNonEmptyArr(entry.ref.split("/")));
		if (!schema[name]) {
			schema[name] = remoteSchema;
			await this.mergeRefsFromRemote(schema, entry, remoteSchema);
		}
	}

	private serializeEntrySideEffectForSchema(
		schema: SwaggerSchema, entry: SerializeEntry
	) {
		const jsonSchema = getJsonSchema(entry.serializeInto);
		if (entryHasWhiteList(entry)) {
			whitelistKeys((jsonSchema.properties as any), entry.serializeOptions.whitelist);
			if (!entry.swaggerSchemaDefinitionName) {
				throw new Error("An entry with 'whitelist' should also have a 'swaggerSchemaDefinitionName'");
			}
			if (entry.swaggerSchemaDefinitionName) {
				schema[entry.swaggerSchemaDefinitionName] = jsonSchema;
			}
		}
	}

	/**
	 * A remote entry might have references to the remote document's schema. This method finds those and merges them to our
	 * patched document.
	 * */
	private async mergeRefsFromRemote(
		schema: SwaggerSchema,
		entry: SwaggerRemoteEntry,
		referencedRemoteSchema: SchemaObject
	) {
		const { document: remoteDocument, prefix } = await this.getRemoteSwaggerDoc(entry);
		const traverseAndMerge = async (iteratedRemoteSchema: SchemaObject | ReferenceObject) => {
			if (isSchemaObject(iteratedRemoteSchema)) {
				if (iteratedRemoteSchema.items) {
					await traverseAndMerge(iteratedRemoteSchema.items!);
				} else if (iteratedRemoteSchema.properties) {
					for (const key of Object.keys(iteratedRemoteSchema.properties)) {
						if (!iteratedRemoteSchema.properties![key]) {
							continue;
						}
						await traverseAndMerge(iteratedRemoteSchema.properties![key]!);
					}
				} else if (iteratedRemoteSchema.anyOf) {
					iteratedRemoteSchema.anyOf.forEach(traverseAndMerge);
				} else if (iteratedRemoteSchema.oneOf) {
					iteratedRemoteSchema.oneOf.forEach(traverseAndMerge);
				}
			} else {
				const { $ref: ref } = iteratedRemoteSchema;
				const referencedSchemaRefName = lastFromNonEmptyArr(ref.split("/"));
				if (!schema[prefix + referencedSchemaRefName]) {
					const referencedSchema = parseURIFragmentIdentifierRepresentation<SchemaObject>(
						remoteDocument, ref
					);
					schema[prefix + referencedSchemaRefName] = referencedSchema;
					await traverseAndMerge(referencedSchema);
				}
			}
		};

		await traverseAndMerge(referencedRemoteSchema);
		fixRefsModelPrefix(referencedRemoteSchema as JSONSchema, prefix);
	}

	async getSchemaForEntry(entry: SwaggerRemoteEntry) {
		const remoteSwagger = (await this.getRemoteSwaggerDoc(entry)).document;
		return parseJSONPointer<JSONSchema>(
			remoteSwagger,
			`/components/schemas${entry.ref}`
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

const hasSwaggerSchemaDefinitionName = (entry: unknown): entry is { swaggerSchemaDefinitionName: string } =>
	isObject(entry) && !!entry.swaggerSchemaDefinitionName;

const replaceWithRefToCustomSwaggerSchemaDefinitionName =
	(entry: { swaggerSchemaDefinitionName: string }, schema: SchemaItem) => (
		entry.swaggerSchemaDefinitionName
			? { "$ref": `#/components/schemas/${entry.swaggerSchemaDefinitionName}` }
			: schema
	);

export const isPagedOperation = (operation: OperationObject) =>
	(operation.parameters || []).some(param => (param as ParameterObject).name === "page") || false;

export const asPagedResponse = (schema: SchemaItem): SchemaObject => ({
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
	} else if (!isSchemaObject(schema) && (
		schema.$ref === "#/components/schemas/store-multiLang"
		|| schema.$ref === "#/components/schemas/MultiLangDto"
	)) {
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
