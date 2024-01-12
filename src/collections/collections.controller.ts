import { Controller, Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { createQueryParamsInterceptor } from "src/interceptors/query-params/query-params.interceptor";
import { Collection, FindCollectionsDto } from "./collection.dto";
import { CollectionsService } from "./collections.service";
import { SwaggerRemote, SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { FindOneDto, GetPageDto } from "../common.dto";
import { stringToArray } from "../utils";

@SwaggerRemote()
@ApiSecurity("access_token")
@Controller("collections")
@ApiTags("Collections")
export class CollectionsController {
	constructor(
		private collectionsService: CollectionsService
	) {}

	/** Get all collections */
	@Get()
	@UseInterceptors(createQueryParamsInterceptor(GetPageDto, Collection))
	@SwaggerRemoteRef({ source: "store", ref: "collection" })
	async getAll(@Query() { idIn }: GetPageDto) {
		const ids = stringToArray(idIn);
		return this.collectionsService.getCollections(ids);
	}

	/** Get all root collections */
	@Get("roots")
	@UseInterceptors(createQueryParamsInterceptor(FindCollectionsDto, Collection))
	@SwaggerRemoteRef({ source: "store", ref: "collection" })
	async findRoots(@Query() {}: FindCollectionsDto) {
		return this.collectionsService.findRoots();
	}

	/** Get collection by id */
	@Get(":id")
	@UseInterceptors(createQueryParamsInterceptor(FindOneDto, Collection))
	@SwaggerRemoteRef({ source: "store", ref: "collection" })
	findOne(@Param("id") id: string, @Query() {}: FindOneDto) {
		return this.collectionsService.findOne(id);
	}

	/** Get child collections */
	@Get(":id/children")
	@UseInterceptors(createQueryParamsInterceptor(FindCollectionsDto, Collection))
	@SwaggerRemoteRef({ source: "store", ref: "collection" })
	async findChildren(@Param("id") id: string, @Query() {}: FindCollectionsDto) {
		return this.collectionsService.findChildren(id);
	}
}
