import { Body, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { GeoConvertService } from "./geo-convert.service";
import { GetGeoConvertDto } from "./geo-convert.dto";
import { RequestPersonToken } from "src/decorators/request-person-token.decorator";

@ApiTags("GeoConvert")
@LajiApiController("geo-convert")
export class GeoConvertController {

	constructor(
		private geoConvertService: GeoConvertService
	) {}

	/** Convert a FinBIF occurrence data file into a geographic data format */
	@Get(":fileId")
	@HttpCode(200)
	get(
		/** Input file's identifier */
		@Param("fileId") fileId: string,
		@Query() query: GetGeoConvertDto,
		@RequestPersonToken({ required: false, description:	"For use with restricted data downloads" })
			personToken?: string
	) {
		return this.geoConvertService.get(fileId, query, personToken);
	}

	/** Convert a FinBIF occurrence data file into a geographic data format */
	@Post(":fileId")
	@HttpCode(200)
	post(
		/** Input file's identifier */
		@Param("fileId") fileId: string,
		@Query() query: GetGeoConvertDto,
		@Body() data: any
	) {
		return this.geoConvertService.post(fileId, query, data);
	}

	/** Get status of a conversion */
	@Get("status/:conversionId")
	@HttpCode(200)
	status(
		@Param("conversionId") conversionId: string
	) {
		return this.geoConvertService.status(conversionId);
	}

	/** Get the output file of a conversion */
	@Get("output/:conversionId")
	@HttpCode(200)
	output(
		@Param("conversionId") conversionId: string
	) {
		return this.geoConvertService.status(conversionId);
	}
}
