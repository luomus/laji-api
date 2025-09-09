import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Collection } from "./collection.dto";
import { CollectionsService } from "./collections.service";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { CollectionMultiLangHackInterceptor } from "./collection-multi-lang-hack.interceptor";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { Translator } from "src/interceptors/translator.interceptor";
import { Serializer } from "src/serialization/serializer.interceptor";
import { QueryWithPagingAndIdIn, QueryWithPagingDto } from "src/common.dto";

@LajiApiController("collections")
@ApiTags("Collections")
export class CollectionsController {
	constructor(
		private collectionsService: CollectionsService
	) {}

	/** Get all collections */
	@Get()
	@UseInterceptors(CollectionMultiLangHackInterceptor, Translator, Serializer(Collection), Paginator)
	@SwaggerRemoteRef({ source: "store", ref: "/collection" })
	async getPage(@Query() { idIn }: QueryWithPagingAndIdIn) {
		return this.collectionsService.findCollections(idIn);
	}

	/** Get all root collections */
	@Get("roots")
	@UseInterceptors(CollectionMultiLangHackInterceptor, Translator, Serializer(Collection), Paginator)
	@SwaggerRemoteRef({ source: "store", ref: "/collection" })
	async findRoots(@Query() {}: QueryWithPagingDto) {
		return this.collectionsService.findRoots();
	}

	/** Get collection by id */
	@Get(":id")
	@UseInterceptors(CollectionMultiLangHackInterceptor, Translator, Serializer(Collection))
	@SwaggerRemoteRef({ source: "store", ref: "/collection" })
	get(@Param("id") id: string) {
		return this.collectionsService.get(id);
	}

	/** Get child collections */
	@Get(":id/children")
	@UseInterceptors(CollectionMultiLangHackInterceptor, Translator, Serializer(Collection), Paginator)
	@SwaggerRemoteRef({ source: "store", ref: "/collection" })
	async findChildren(@Param("id") id: string, @Query() {}: QueryWithPagingDto) {
		return this.collectionsService.findChildren(id);
	}
}
