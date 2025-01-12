import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { createQueryParamsInterceptor } from "src/interceptors/query-params/query-params.interceptor";
import { InformalTaxonGroupsService } from "./informal-taxon-groups.service";
import { Lang, QueryWithLangDto, QueryWithPagingAndLangAndIdIn, QueryWithPagingAndLang } from "src/common.dto";
import { SwaggerRemoteRef, SwaggerRemoteRefEntry } from "src/swagger/swagger-remote.decorator";
import { SchemaItem } from "src/swagger/swagger.service";
import { ResultsArray } from "src/interceptors/results-array.interceptor";

const wrapSchemaToJsonLdContextResults = (schema: SchemaItem) => ({
	type: "object",
	properties: {
		"@context": { type: "string" },
		results: {
			type: "array",
			items: schema
		}
	}
});

const fromStoreWithJSONLdContextFixed: SwaggerRemoteRefEntry = {
	source: "store",
	ref: "informalTaxonGroup",
	customizeResponseSchema: wrapSchemaToJsonLdContextResults
};

@ApiTags("InformalTaxonGroup")
@LajiApiController("informal-taxon-groups")
export class InformalTaxonGroupsController {

	constructor(private informalTaxonGroupsService: InformalTaxonGroupsService) {}

	/** Get a page of informal taxon groups */
	@Get()
	@UseInterceptors(createQueryParamsInterceptor(QueryWithPagingAndLangAndIdIn))
	@SwaggerRemoteRef({ source: "store", ref: "informalTaxonGroup" })
	getPage(@Query() { idIn }: QueryWithPagingAndLangAndIdIn) {
		return this.informalTaxonGroupsService.find(idIn);
	}

	/** Get the informal taxon group tree */
	@Get("tree")
	@SwaggerRemoteRef(fromStoreWithJSONLdContextFixed)
	async getTree(@Query() { lang = Lang.en, langFallback }: QueryWithLangDto) {
		return ({
			results: await this.informalTaxonGroupsService.getTranslatedTree(lang, langFallback),
			"@context": await this.informalTaxonGroupsService.getJsonLdContext()
		});
	}

	/** Get first level of the informal taxon group tree */
	@Get("roots")
	@UseInterceptors(ResultsArray, createQueryParamsInterceptor(QueryWithLangDto))
	@SwaggerRemoteRef(fromStoreWithJSONLdContextFixed)
	getRoots(@Query() _: QueryWithLangDto) {
		return this.informalTaxonGroupsService.getRoots();
	}

	/** Get an informal taxon group by id */
	@Get(":id")
	@UseInterceptors(createQueryParamsInterceptor(QueryWithLangDto))
	@SwaggerRemoteRef({ source: "store", ref: "informalTaxonGroup" })
	get(@Param("id") id: string, @Query() _: QueryWithLangDto) {
		return this.informalTaxonGroupsService.get(id);
	}

	/** Get an informal taxon group's immediate children */
	@Get(":id/children")
	@UseInterceptors(ResultsArray, createQueryParamsInterceptor(QueryWithLangDto))
	@SwaggerRemoteRef(fromStoreWithJSONLdContextFixed)
	getChildren(@Param("id") id: string, @Query() _: QueryWithLangDto) {
		return this.informalTaxonGroupsService.getChildren(id);
	}

	/** Get informal taxon group's parents */
	@Get(":id/parents")
	@UseInterceptors(createQueryParamsInterceptor(QueryWithPagingAndLang))
	@SwaggerRemoteRef({ source: "store", ref: "informalTaxonGroup" })
	async getParents(@Param("id") id: string, @Query() _: QueryWithPagingAndLang) {
		return [await this.informalTaxonGroupsService.getParent(id)];
	}

	/** Get informal taxon group's parents */
	@Get(":id/parent")
	@UseInterceptors(createQueryParamsInterceptor(QueryWithLangDto))
	@SwaggerRemoteRef({ source: "store", ref: "informalTaxonGroup" })
	getParent(@Param("id") id: string, @Query() _: QueryWithLangDto) {
		return this.informalTaxonGroupsService.getParent(id);
	}

	/** Get informal taxon group's siblings */
	@Get(":id/siblings")
	@UseInterceptors(ResultsArray, createQueryParamsInterceptor(QueryWithLangDto))
	@SwaggerRemoteRef(fromStoreWithJSONLdContextFixed)
	getSiblings(@Param("id") id: string, @Query() _: QueryWithLangDto) {
		return this.informalTaxonGroupsService.getSiblings(id);
	}
}
