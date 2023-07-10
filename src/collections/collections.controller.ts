import { Controller, Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { createQueryParamsInterceptor } from "src/interceptors/query-params/query-params.interceptor";
import { Collection, FindCollectionsDto, FindOneDto, GetPageDto } from "./collection.dto";
import { CollectionsService } from "./collections.service";

@ApiSecurity("access_token")
@Controller("collections")
@ApiTags("Collections")
export class CollectionsController {
	constructor(
		private collectionsService: CollectionsService
	) {}

	/*
	 * Get all collections
	 */
	@Get()
	@UseInterceptors(createQueryParamsInterceptor(GetPageDto, Collection))
	async getAll(@Query() { idIn }: GetPageDto) {
		const ids = typeof idIn === "string"
			? idIn.split(",")
			: [];
		return this.collectionsService.getCollections(ids);
	}

	/*
	 * Get all root collections
	 */
	@Get("roots")
	@UseInterceptors(createQueryParamsInterceptor(FindCollectionsDto, Collection))
	async findRoots(@Query() {}: FindCollectionsDto) {
		return this.collectionsService.findRoots();
	}

	/*
	 * Get collection by id
	 */
	@Get(":id")
	@UseInterceptors(createQueryParamsInterceptor(FindOneDto, Collection))
	findOne(@Param("id") id: string, @Query() {}: FindOneDto) {
		return this.collectionsService.findOne(id);
	}

	/*
	 * Get child collections
	 */
	@Get(":id/children")
	@UseInterceptors(createQueryParamsInterceptor(FindCollectionsDto, Collection))
	async findChildren(@Param("id") id: string, @Query() {}: FindCollectionsDto) {
		return this.collectionsService.findChildren(id);
	}
}
