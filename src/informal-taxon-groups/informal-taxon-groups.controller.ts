import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { InformalTaxonGroupsService } from "./informal-taxon-groups.service";
import { Lang, QueryWithPagingAndIdIn } from "src/common.dto";
import { SwaggerRemoteRef, SwaggerRemoteRefEntry } from "src/swagger/swagger-remote.decorator";
import { ResultsArray, swaggerResponseAsResultsArray } from "src/interceptors/results-array.interceptor";
import { applyLangToJsonLdContext } from "src/json-ld/json-ld.utils";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { Translator } from "src/interceptors/translator.interceptor";
import { RequestLang } from "src/decorators/request-lang.decorator";

const fromStoreWithJSONLdContextFixed: SwaggerRemoteRefEntry = {
	source: "store",
	ref: "/informalTaxonGroup",
	customizeResponseSchema: swaggerResponseAsResultsArray
};

@ApiTags("InformalTaxonGroup")
@LajiApiController("informal-taxon-groups")
export class InformalTaxonGroupsController {

	constructor(private informalTaxonGroupsService: InformalTaxonGroupsService) {}

	/** Get a page of informal taxon groups */
	@Get()
	@UseInterceptors(Translator, Paginator)
	@SwaggerRemoteRef({ source: "store", ref: "/informalTaxonGroup" })
	getPage(@Query() { idIn }: QueryWithPagingAndIdIn) {
		return this.informalTaxonGroupsService.find(idIn);
	}

	/** Get the informal taxon group tree */
	@Get("tree")
	@SwaggerRemoteRef(fromStoreWithJSONLdContextFixed)
	async getTree(@RequestLang() lang: Lang) {
		return applyLangToJsonLdContext({
			results: await this.informalTaxonGroupsService.getTranslatedTree(lang),
			"@context": await this.informalTaxonGroupsService.getJsonLdContext()
		}, lang);
	}

	/** Get first level of the informal taxon group tree */
	@Get("roots")
	@UseInterceptors(Translator, ResultsArray)
	@SwaggerRemoteRef(fromStoreWithJSONLdContextFixed)
	getRoots() {
		return this.informalTaxonGroupsService.getRoots();
	}

	/** Get an informal taxon group by id */
	@Get(":id")
	@UseInterceptors(Translator)
	@SwaggerRemoteRef({ source: "store", ref: "/informalTaxonGroup" })
	get(@Param("id") id: string) {
		return this.informalTaxonGroupsService.get(id);
	}

	/** Get an informal taxon group's immediate children */
	@Get(":id/children")
	@UseInterceptors(Translator, ResultsArray)
	@SwaggerRemoteRef(fromStoreWithJSONLdContextFixed)
	getChildren(@Param("id") id: string) {
		return this.informalTaxonGroupsService.getChildren(id);
	}

	/** Get informal taxon group's parents */
	@Get(":id/parent")
	@UseInterceptors(Translator)
	@SwaggerRemoteRef({ source: "store", ref: "/informalTaxonGroup" })
	getParent(@Param("id") id: string) {
		return this.informalTaxonGroupsService.getParent(id);
	}

	/** Get informal taxon group's siblings */
	@Get(":id/siblings")
	@UseInterceptors(Translator, ResultsArray)
	@SwaggerRemoteRef(fromStoreWithJSONLdContextFixed)
	getSiblings(@Param("id") id: string) {
		return this.informalTaxonGroupsService.getSiblings(id);
	}
}
