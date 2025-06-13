import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { AreaService } from "./area.service";
import { AreaTypeDto, GetAreaPageDto } from "./area.dto";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";
import { QueryWithLangDto } from "src/common.dto";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { Translator } from "src/interceptors/translator.interceptor";

@ApiTags("Area")
@LajiApiController("areas")
export class AreaController {

	constructor(private areaService: AreaService) {}

	/** Get a page of areas */
	@Get(":id")
	@UseInterceptors(Translator)
	@SwaggerRemoteRef({ source: "store", ref: "area" })
	get(@Param("id") id: string, @Query() _: QueryWithLangDto) {
		return this.areaService.get(id);
	}

	/** Get an areas by id */
	@Get()
	@UseInterceptors(Paginator, Translator)
	@SwaggerRemoteRef({ source: "store", ref: "area" })
	getPage(@Query() { type, areaType, idIn }: GetAreaPageDto) {
		let typeQName: AreaTypeDto | undefined = areaType;
		if (!typeQName && type) {
			const maybeValidQName = `ML.${type}`;
			if (Object.values(AreaTypeDto).includes(maybeValidQName as AreaTypeDto)) {
				typeQName = maybeValidQName as AreaTypeDto;
			}
		}
		return this.areaService.find(typeQName, idIn);
	}
}
