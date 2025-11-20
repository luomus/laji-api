import { Body, HttpCode, Post, UseInterceptors } from "@nestjs/common";
import { CoordinatesService } from "./coordinates.service";
import { GeoJSON } from "geojson";
import { RequestLang } from "src/decorators/request-lang.decorator";
import { Lang } from "src/common.dto";
import { AddContextToPageLikeResult } from "src/interceptors/add-context-to-page-like-result.interceptor";
import { Translator } from "src/interceptors/translator.interceptor";
import { Serializer } from "src/serialization/serializer.interceptor";
import { AddressComponent, Location } from "./coordinates.dto";
import { ApiBody, ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ResultsArray, swaggerResponseAsResultsArray } from "src/interceptors/results-array.interceptor";

@ApiTags("Coordinates")
@LajiApiController("coordinates")
export class CoordinatesController {

	constructor(private coordinatesService: CoordinatesService) {}

	@Post("location")
	@UseInterceptors(
		AddContextToPageLikeResult,
		ResultsArray,
		Translator,
		Serializer(Location, { localJsonLdContext: "coordinates-location" })
	)
	@HttpCode(200)
	@ApiOkResponse({ schema: swaggerResponseAsResultsArray({ $ref: getSchemaPath(Location) }) })
	@ApiExtraModels(AddressComponent, Location)
	@ApiBody({
		schema: {
			type: "object",
			example: { type: "Point", coordinates: [25, 60] },
		},
	})
	getLocationInformation(@Body() geoJSON: GeoJSON, @RequestLang() lang: Lang) {
		return this.coordinatesService.getLocationInformation(geoJSON, lang);
	}
}
