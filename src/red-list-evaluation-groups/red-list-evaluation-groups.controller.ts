import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { RedListEvaluationGroupsService } from "./red-list-evaluation-groups.service";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { Translator } from "src/interceptors/translator.interceptor";
import { SwaggerRemoteRef, SwaggerRemoteRefEntry } from "src/swagger/swagger-remote.decorator";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { Lang, QueryWithPagingAndIdIn } from "src/common.dto";
import { RequestLang } from "src/decorators/request-lang.decorator";
import { swaggerResponseAsResultsArray, ResultsArray } from "src/interceptors/results-array.interceptor";
import { applyLangToJsonLdContext } from "src/json-ld/json-ld.utils";

const fromStoreWithJSONLdContextFixed: SwaggerRemoteRefEntry = {
	source: "store",
	ref: "/iucnRedListTaxonGroup",
	customizeResponseSchema: swaggerResponseAsResultsArray
};

@ApiTags("Red List Evaluation Groups")
@LajiApiController("red-list-evaluation-groups")
export class RedListEvaluationGroupsController {
	constructor(private redListEvaluationGroupsService: RedListEvaluationGroupsService) {}

	/** Get a page of informal taxon groups */
	@Get()
	@UseInterceptors(Translator, Paginator)
	@SwaggerRemoteRef({ source: "store", ref: "/iucnRedListTaxonGroup" })
	getPage(@Query() { idIn }: QueryWithPagingAndIdIn) {
		return this.redListEvaluationGroupsService.find(idIn);
	}

	/** Get the informal taxon group tree */
	@Get("tree")
	@SwaggerRemoteRef(fromStoreWithJSONLdContextFixed)
	async getTree(@RequestLang() lang: Lang) {
		return applyLangToJsonLdContext({
			results: await this.redListEvaluationGroupsService.getTranslatedTree(lang),
			"@context": await this.redListEvaluationGroupsService.getJsonLdContext()
		}, lang);
	}

	/** Get first level of the informal taxon group tree */
	@Get("roots")
	@UseInterceptors(Translator, ResultsArray)
	@SwaggerRemoteRef(fromStoreWithJSONLdContextFixed)
	getRoots() {
		return this.redListEvaluationGroupsService.getRoots();
	}

	/** Get an informal taxon group by id */
	@Get(":id")
	@UseInterceptors(Translator)
	@SwaggerRemoteRef({ source: "store", ref: "/iucnRedListTaxonGroup" })
	get(@Param("id") id: string) {
		return this.redListEvaluationGroupsService.get(id);
	}

	/** Get an informal taxon group's immediate children */
	@Get(":id/children")
	@UseInterceptors(Translator, ResultsArray)
	@SwaggerRemoteRef(fromStoreWithJSONLdContextFixed)
	getChildren(@Param("id") id: string) {
		return this.redListEvaluationGroupsService.getChildren(id);
	}

	/** Get informal taxon group's parents */
	@Get(":id/parent")
	@UseInterceptors(Translator)
	@SwaggerRemoteRef({ source: "store", ref: "/iucnRedListTaxonGroup" })
	getParent(@Param("id") id: string) {
		return this.redListEvaluationGroupsService.getParent(id);
	}

	/** Get informal taxon group's siblings */
	@Get(":id/siblings")
	@UseInterceptors(Translator, ResultsArray)
	@SwaggerRemoteRef(fromStoreWithJSONLdContextFixed)
	getSiblings(@Param("id") id: string) {
		return this.redListEvaluationGroupsService.getSiblings(id);
	}
}
