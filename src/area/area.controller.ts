import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { AreaService } from "./area.service";
import { GetAreaPageDto } from "./area.dto";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";
import { createQueryParamsInterceptor } from "src/interceptors/query-params/query-params.interceptor";
import { LangQueryDto } from "src/common.dto";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";

@ApiTags("Area")
@LajiApiController("areas")
export class AreaController {

	constructor(private areaService: AreaService) {}

	/** Get a page of areas */
	@Get(":id")
	@UseInterceptors(createQueryParamsInterceptor(LangQueryDto))
	@SwaggerRemoteRef({ source: "store", ref: "area" })
	get(@Param("id") id: string, @Query() _: LangQueryDto) {
		return this.areaService.get(id);
	}

	/** Get a page of areas */
	@Get()
	@UseInterceptors(createQueryParamsInterceptor(GetAreaPageDto))
	@SwaggerRemoteRef({ source: "store", ref: "area" })
	getPage(@Query() { type, idIn }: GetAreaPageDto) {
		const typeQName = type ? `ML.${type}` : type;
		return this.areaService.find(typeQName, idIn);
	}
}
