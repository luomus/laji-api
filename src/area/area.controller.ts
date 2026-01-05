import { Get, HttpException, Param, Query, Req, UseInterceptors } from "@nestjs/common";
import { AreaService } from "./area.service";
import { AreaTypeDto, GetAreaPageDto } from "./area.dto";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { Translator } from "src/interceptors/translator.interceptor";
import { Request } from "src/request";

@ApiTags("Areas")
@LajiApiController("areas")
export class AreaController {

	constructor(private areaService: AreaService) {}

	/** Get an area by id */
	@Get(":id")
	@UseInterceptors(Translator)
	@SwaggerRemoteRef({ source: "store", ref: "/area" })
	get(@Param("id") id: string) {
		return this.areaService.get(id);
	}

	/** Get a page of areas */
	@Get()
	@UseInterceptors(Paginator, Translator)
	@SwaggerRemoteRef({ source: "store", ref: "/area" })
	getPage(@Query() query: GetAreaPageDto, @Req() request: Request) {
		const { type, areaType, idIn } = query as any;
		let typeQName: AreaTypeDto | undefined = areaType;
		if (!typeQName && type) {
			if (request.headers["api-version"] === "1"){
				throw new HttpException("'type' param is deprecated for API v1. Use `areaType` instead", 422);
			}
			const maybeValidQName = `ML.${type}`;
			if (Object.values(AreaTypeDto).includes(maybeValidQName as AreaTypeDto)) {
				typeQName = maybeValidQName as AreaTypeDto;
			}
		}
		return this.areaService.find(typeQName, idIn);
	}
}
