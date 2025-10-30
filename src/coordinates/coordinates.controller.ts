import { Body, HttpCode, Post, UseInterceptors } from "@nestjs/common";
import { CoordinatesService } from "./coordinates.service";
import { GeoJSON } from "geojson";
import { RequestLang } from "src/decorators/request-lang.decorator";
import { Lang } from "src/common.dto";
import { AddContextToPageLikeResult } from "src/interceptors/add-context-to-page-like-result.interceptor";
import { Translator } from "src/interceptors/translator.interceptor";
import { Serializer } from "src/serialization/serializer.interceptor";
import { AddressComponent, Location, LocationResponse } from "./coordinates.dto";
import { ApiExtraModels, ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";

@ApiTags("Coordinates")
@LajiApiController("coordinates")
export class CoordinatesController {

	constructor(private coordinatesService: CoordinatesService) {}

	@Post("location")
	@UseInterceptors(
		AddContextToPageLikeResult,
		Translator,
		Serializer(Location, { localJsonLdContext: "coordinates-location" })
	)
	@HttpCode(200)
	@ApiExtraModels(AddressComponent)
	getLocationInformation(@Body() geoJSON: GeoJSON, @RequestLang() lang: Lang): Promise<LocationResponse> {
		return this.coordinatesService.getLocationInformation(geoJSON, lang);
	}
}
