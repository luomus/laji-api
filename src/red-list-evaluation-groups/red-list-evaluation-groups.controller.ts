import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { RedListEvaluationGroupsService } from "./red-list-evaluation-groups.service";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { Translator } from "src/interceptors/translator.interceptor";
import { SwaggerRemote, SwaggerRemoteEntry } from "src/swagger/swagger-remote.decorator";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { QueryWithPagingAndIdIn } from "src/common.dto";
import { RequestLang } from "src/decorators/request-lang.decorator";
import { swaggerResponseAsResultsArray, ResultsArray } from "src/interceptors/results-array.interceptor";
import { applyLangToJsonLdContext } from "src/json-ld/json-ld.utils";
import { pipe } from "rxjs";
import { idAlwaysPresent } from "src/collections/collections.controller";
import { JSONSchemaRef } from "src/json-schema.utils";
import { firstFromNonEmptyArr, asTuple } from "src/utils";
import { LangPreference } from "src/lang/lang.utils";

const fromStoreWithJSONLdContextFixed: SwaggerRemoteEntry = {
	source: "store",
	ref: "/iucnRedListTaxonGroup",
	customizeResponseSchema: swaggerResponseAsResultsArray
};

@ApiTags("Red List Evaluation Groups")
@LajiApiController("red-list-evaluation-groups")
export class RedListEvaluationGroupsController {
	constructor(private redListEvaluationGroupsService: RedListEvaluationGroupsService) {}

	/** Get a page of red list evaluation groups */
	@Get()
	@UseInterceptors(Translator, Paginator)
	@SwaggerRemote({ source: "store", ref: "/iucnRedListTaxonGroup" })
	getPage(@Query() { idIn }: QueryWithPagingAndIdIn) {
		return this.redListEvaluationGroupsService.find(idIn);
	}

	/** Get the red list evaluation group tree */
	@Get("tree")
	@SwaggerRemote({
		...fromStoreWithJSONLdContextFixed,
		customizeResponseSchema: (schema, document) => pipe(
			idAlwaysPresent,
			firstFromNonEmptyArr,
			swaggerResponseAsResultsArray
		)(asTuple(schema as JSONSchemaRef, document)),
	})
	async getTree(@RequestLang() langPreferences: LangPreference[]) {
		return applyLangToJsonLdContext({
			results: await this.redListEvaluationGroupsService.getTranslatedTree(langPreferences),
			"@context": await this.redListEvaluationGroupsService.getJsonLdContext()
		}, langPreferences);
	}

	/** Get first level of the red list evaluation group tree */
	@Get("roots")
	@UseInterceptors(Translator, ResultsArray)
	@SwaggerRemote(fromStoreWithJSONLdContextFixed)
	getRoots() {
		return this.redListEvaluationGroupsService.getRoots();
	}

	/** Get an red list evaluation group by id */
	@Get(":id")
	@UseInterceptors(Translator)
	@SwaggerRemote({ source: "store", ref: "/iucnRedListTaxonGroup" })
	get(@Param("id") id: string) {
		return this.redListEvaluationGroupsService.get(id);
	}

	/** Get an red list evaluation group's immediate children */
	@Get(":id/children")
	@UseInterceptors(Translator, ResultsArray)
	@SwaggerRemote(fromStoreWithJSONLdContextFixed)
	getChildren(@Param("id") id: string) {
		return this.redListEvaluationGroupsService.getChildren(id);
	}

	/** Get red list evaluation group's parents */
	@Get(":id/parent")
	@UseInterceptors(Translator)
	@SwaggerRemote({ source: "store", ref: "/iucnRedListTaxonGroup" })
	getParent(@Param("id") id: string) {
		return this.redListEvaluationGroupsService.getParent(id);
	}

	/** Get red list evaluation group's siblings */
	@Get(":id/siblings")
	@UseInterceptors(Translator, ResultsArray)
	@SwaggerRemote(fromStoreWithJSONLdContextFixed)
	getSiblings(@Param("id") id: string) {
		return this.redListEvaluationGroupsService.getSiblings(id);
	}
}
