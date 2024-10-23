import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createQueryParamsInterceptor } from "src/interceptors/query-params/query-params.interceptor";
import { Collection, FindCollectionsDto } from "./collection.dto";
import { CollectionsService } from "./collections.service";
import { FindOneDto, GetPageDto } from "../common.dto";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { CollectionMultiLangHackInterceptor } from "./collection-multi-lang-hack.interceptor";

@LajiApiController("collections")
@ApiTags("Collections")
export class CollectionsController {
	constructor(
		private collectionsService: CollectionsService
	) {}

	/** Get all collections */
	@Get()
	@UseInterceptors(
		CollectionMultiLangHackInterceptor,
		createQueryParamsInterceptor(GetPageDto, Collection)
	)
	@SwaggerRemoteRef({ source: "store", ref: "collection" })
	async getPage(@Query() { idIn }: GetPageDto) {
		return this.collectionsService.findCollections(idIn);
	}

	/** Get all root collections */
	@Get("roots")
	@UseInterceptors(
		CollectionMultiLangHackInterceptor,
		createQueryParamsInterceptor(FindCollectionsDto, Collection)
	)
	@SwaggerRemoteRef({ source: "store", ref: "collection" })
	async findRoots(@Query() {}: FindCollectionsDto) {
		return this.collectionsService.findRoots();
	}

	/** Get collection by id */
	@Get(":id")
	@UseInterceptors(
		CollectionMultiLangHackInterceptor,
		createQueryParamsInterceptor(FindOneDto, Collection)
	)
	@SwaggerRemoteRef({ source: "store", ref: "collection" })
	findOne(@Param("id") id: string, @Query() {}: FindOneDto) {
		return this.collectionsService.get(id);
	}

	/** Get child collections */
	@Get(":id/children")
	@UseInterceptors(
		CollectionMultiLangHackInterceptor,
		createQueryParamsInterceptor(FindCollectionsDto, Collection)
	)
	@SwaggerRemoteRef({ source: "store", ref: "collection" })
	async findChildren(@Param("id") id: string, @Query() {}: FindCollectionsDto) {
		return this.collectionsService.findChildren(id);
	}
}
