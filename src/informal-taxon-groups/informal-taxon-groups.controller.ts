import { Get, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { createQueryParamsInterceptor } from "src/interceptors/query-params/query-params.interceptor";
import { InformalTaxonGroupsService } from "./informal-taxon-groups.service";
import { Lang, QueryWithPagingAndLangDto } from "src/common.dto";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { Paginator } from "src/interceptors/paginator.interceptor";

@ApiTags("InformalTaxonGroup")
@LajiApiController("informal-taxon-groups")
export class InformalTaxonGroupsController {

	constructor(private informalTaxonGroupsService: InformalTaxonGroupsService) {}

	@Get()
	@UseInterceptors(createQueryParamsInterceptor(QueryWithPagingAndLangDto))
	@SwaggerRemoteRef({ source: "store", ref: "informalTaxonGroup" })
	getPage(@Query() { idIn }: QueryWithPagingAndLangDto) {
		return this.informalTaxonGroupsService.find(idIn);
	}

	@Get("tree")
	@UseInterceptors(Paginator)
	@SwaggerRemoteRef({ source: "store", ref: "informalTaxonGroup" })
	getTree(@Query() { lang = Lang.en, langFallback }: QueryWithPagingAndLangDto) {
		return this.informalTaxonGroupsService.getTranslatedTree(lang, langFallback);
	}
}
