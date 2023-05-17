import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { FindOneDto, GetPageDto } from "./collection.dto";
import { CollectionsService } from "./collections.service";

@ApiSecurity("access_token")
@Controller("collections")
@ApiTags("collections")
export class CollectionsController {
	constructor(private collectionsService: CollectionsService) {}
	/*
	 * Get all collections
	 */
	@Get()
	getAll(@Query() { page, pageSize, lang, langFallback, idIn }: GetPageDto) {
		const ids = typeof idIn === "string"
			? idIn.split(",")
			: [];
		return this.collectionsService.getPage(ids, lang, langFallback, page, pageSize);
	}

	/*
	 * Get collection by id
	 */
	@Get(":id")
	findOne(@Param("id") id: string, @Query() { lang, langFallback }: FindOneDto) {
		return this.collectionsService.findOne(id, lang, langFallback);
	}

}
