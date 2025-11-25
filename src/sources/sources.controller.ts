import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { QueryWithPagingAndIdIn } from "src/common.dto";
import { SourcesService } from "./sources.service";
import { Serialize } from "src/serialization/serialize.decorator";
import { Source } from "./sources.dto";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { Translator } from "src/interceptors/translator.interceptor";
import { Paginator } from "src/interceptors/paginator.interceptor";

@ApiTags("Source")
@LajiApiController("sources")
export class SourcesController {
	constructor(private sourcesService: SourcesService) {}

	/** Get all sources */
	@Get(":id")
	@UseInterceptors(Translator)
	@Serialize(Source, { whitelist: ["id", "name", "description"] }, "SensitiveSource")
	get(@Param("id") id: string) {
		return this.sourcesService.get(id);
	}

	/** Get a source by id */
	@Get()
	@UseInterceptors(Translator, Paginator)
	@Serialize(Source, { whitelist: ["id", "name", "description"] }, "SensitiveSource")
	getPage(@Query() { idIn }: QueryWithPagingAndIdIn): Promise<Source[]> {
		return this.sourcesService.find(idIn);
	}
}
