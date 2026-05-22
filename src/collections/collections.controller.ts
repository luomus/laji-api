import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiOkResponse, ApiTags, OpenAPIObject } from "@nestjs/swagger";
import { Collection, } from "./collection.dto";
import { CollectionsService } from "./collections.service";
import { SwaggerRemote } from "src/swagger/swagger-remote.decorator";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { CollectionMultiLangHackInterceptor } from "./collection-multi-lang-hack.interceptor";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { Translator } from "src/interceptors/translator.interceptor";
import { Serializer } from "src/serialization/serializer.interceptor";
import { LANGS, QueryWithPagingAndIdInAndSelectedFields, QueryWithPagingDto } from "src/common.dto";
import { omit } from "src/typing.utils";
import { JSONSchemaObject, JSONSchemaRef } from "src/json-schema.utils";
import { asTuple, firstFromNonEmptyArr, parseURIFragmentIdentifierRepresentation, pipe } from "src/utils";
import { asPagedResponse } from "src/swagger/swagger.service";
import { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { SelectedFields } from "src/interceptors/selected-fields.interceptor";
import { RequestLang } from "src/decorators/request-lang.decorator";
import { LangPreference } from "src/lang/lang.utils";
import { ResultsArray, swaggerResponseAsResultsArray } from "src/interceptors/results-array.interceptor";

export const idAlwaysPresent = ([refSchema, document]: [JSONSchemaRef, OpenAPIObject]) => {
	const referredSchema = parseURIFragmentIdentifierRepresentation(document, refSchema.$ref) as JSONSchemaObject;
	if (!referredSchema.required) {
		referredSchema.required = [];
	}
	referredSchema.required.push("id");
	return [refSchema, document];
};

const sensitiveProps = ["collectionLocation", "dataLocation", "inMustikka", "editor", "creator"];
const filterSensitiveProps = ([refSchema, document]: [JSONSchemaRef, OpenAPIObject]) => {
	const referredSchema = parseURIFragmentIdentifierRepresentation(document, refSchema.$ref) as JSONSchemaObject;
	referredSchema.properties = omit(referredSchema.properties!, ...sensitiveProps);
	referredSchema.properties.hasChildren = { type: "boolean" };
	return [refSchema, document];
};

const addMultiLangs = ([refSchema, document]: [JSONSchemaRef, OpenAPIObject]) => {
	const schema: SchemaObject = parseURIFragmentIdentifierRepresentation(document, refSchema.$ref);
	[
		"longName",
		"description",
		"onlineUrl"
	].forEach(property => {
		const origProperty = schema.properties![property] as SchemaObject;
		schema.properties![`${property}MultiLang`] = {
			type: "object",
			properties: LANGS.reduce(
				(properties, lang) => ({ ...properties, [lang]: origProperty }),
				{}),
			_patchMultiLang: false
		} as any;
	});
	return [refSchema, document];
};

const asExpandedSensitiveCollection = (_: any, document: OpenAPIObject) => {
	document.components!.schemas!.ExpandedSensitiveCollection = {
		...document.components!.schemas!.SensitiveCollection,
		properties: {
			...(document.components!.schemas!.SensitiveCollection as SchemaObject)!.properties,
			children: {
				type: "array",
				items: { $ref: "#/components/schemas/ExpandedSensitiveCollection" }
			}
		}
	};
	return swaggerResponseAsResultsArray({ $ref: "#/components/schemas/ExpandedSensitiveCollection" });
};

@LajiApiController("collections")
@ApiTags("Collections")
export class CollectionsController {
	constructor(
		private collectionsService: CollectionsService
	) {}

	/** Get a page of all collections */
	@Get()
	@UseInterceptors(CollectionMultiLangHackInterceptor, SelectedFields, Translator, Serializer(Collection), Paginator)
	@SwaggerRemote({
		source: "store",
		ref: "/collection",
		// This needs to be done only once, because it mutates the Swagger model, creating the new "SensitiveCollection".
		customizeResponseSchema: (schema, document) => pipe(
			idAlwaysPresent,
			filterSensitiveProps,
			addMultiLangs,
			firstFromNonEmptyArr
		)(asTuple(schema as JSONSchemaRef, document)),
		swaggerSchemaDefinitionName: "SensitiveCollection"
	})
	async getPage(@Query() { idIn }: QueryWithPagingAndIdInAndSelectedFields) {
		return this.collectionsService.findCollections(idIn);
	}

	/** Get a page of all root collections */
	@Get("roots")
	@UseInterceptors(CollectionMultiLangHackInterceptor, Translator, Serializer(Collection), Paginator)
	@ApiOkResponse({ schema: asPagedResponse({ $ref: "#/components/schemas/SensitiveCollection" }) })
	async findRoots(@Query() {}: QueryWithPagingDto) {
		return this.collectionsService.findRoots();
	}

	/** Get collection tree */
	@Get("tree")
	@UseInterceptors(ResultsArray)
	@SwaggerRemote({
		source: "store",
		ref: "/collection",
		customizeResponseSchema: asExpandedSensitiveCollection
	})
	async getTree(@RequestLang() langPreferences: LangPreference[]) {
		return this.collectionsService.getTree(langPreferences);
	}

	/** Get collection by id */
	@Get(":id")
	@UseInterceptors(CollectionMultiLangHackInterceptor, Translator, Serializer(Collection))
	@ApiOkResponse({ schema: { $ref: "#/components/schemas/SensitiveCollection" } })
	get(@Param("id") id: string) {
		return this.collectionsService.get(id);
	}

	/** Get child collections */
	@Get(":id/children")
	@UseInterceptors(CollectionMultiLangHackInterceptor, Translator, Serializer(Collection), Paginator)
	@ApiOkResponse({ schema: asPagedResponse({ $ref: "#/components/schemas/SensitiveCollection" }) })
	async findChildren(@Param("id") id: string, @Query() {}: QueryWithPagingDto) {
		return this.collectionsService.findChildren(id);
	}
}
