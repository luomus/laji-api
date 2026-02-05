import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiOkResponse, ApiTags, OpenAPIObject } from "@nestjs/swagger";
import { Collection } from "./collection.dto";
import { CollectionsService } from "./collections.service";
import { SwaggerRemote } from "src/swagger/swagger-remote.decorator";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { CollectionMultiLangHackInterceptor } from "./collection-multi-lang-hack.interceptor";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { Translator } from "src/interceptors/translator.interceptor";
import { Serializer } from "src/serialization/serializer.interceptor";
import { QueryWithPagingAndIdIn, QueryWithPagingDto } from "src/common.dto";
import { omit } from "src/typing.utils";
import { JSONSchemaObject, JSONSchemaRef } from "src/json-schema.utils";
import { parseURIFragmentIdentifierRepresentation } from "src/utils";
import { asPagedResponse } from "src/swagger/swagger.service";

const sensitiveProps = ["collectionLocation", "dataLocation", "inMustikka", "editor", "creator"];
const filterSensitiveProps = (schema: JSONSchemaRef, document: OpenAPIObject) => {
	const referredSchema = parseURIFragmentIdentifierRepresentation(document, schema.$ref) as JSONSchemaObject;
	referredSchema.properties = omit(referredSchema.properties!, ...sensitiveProps);
	return schema;
};

@LajiApiController("collections")
@ApiTags("Collections")
export class CollectionsController {
	constructor(
		private collectionsService: CollectionsService
	) {}

	/** Get a page of all collections */
	@Get()
	@UseInterceptors(CollectionMultiLangHackInterceptor, Translator, Serializer(Collection), Paginator)
	@SwaggerRemote({
		source: "store",
		ref: "/collection",
		// This needs to be done only once, because it mutates the Swagger model, creating the new "SensitiveCollection".
		customizeResponseSchema: filterSensitiveProps,
		swaggerSchemaDefinitionName: "SensitiveCollection"
	})
	async getPage(@Query() { idIn }: QueryWithPagingAndIdIn) {
		return this.collectionsService.findCollections(idIn);
	}

	/** Get a page of all root collections */
	@Get("roots")
	@UseInterceptors(CollectionMultiLangHackInterceptor, Translator, Serializer(Collection), Paginator)
	@ApiOkResponse({ schema: asPagedResponse({ $ref: "#/components/schemas/SensitiveCollection" }) })
	async findRoots(@Query() {}: QueryWithPagingDto) {
		return this.collectionsService.findRoots();
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
