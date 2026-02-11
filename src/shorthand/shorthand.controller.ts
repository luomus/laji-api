import { Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { GetTripReportUnitShorthandDto, GetWaterBirdPairCountUnitShorthandDto, LineTransectUnitShorthandResponseDto }
	from "./shorthand.dto";
import { SelectedFields } from "src/interceptors/selected-fields.interceptor";
import { ResultsArray, swaggerResponseAsResultsArray } from "src/interceptors/results-array.interceptor";
import { SwaggerRemote } from "src/swagger/swagger-remote.decorator";
import { Translator } from "src/interceptors/translator.interceptor";
import { CommonAutocompleteDto } from "src/autocomplete/autocomplete.dto";
import { ShorthandService } from "./shorthand.service";

@ApiTags("Shorthands")
@Controller("shorthand")
export class ShorthandController {

	constructor(private shorthandService: ShorthandService) {}

	@Get("/unit/trip-report")
	@UseInterceptors(SelectedFields)
	// The json-ld typing is actually more than just taxon response, but this is sufficient to get the taxon search
	// results translated.
	@SwaggerRemote({
		source: "laji-backend",
		ref: "/TaxonSearchResponse",
		customizeResponseSchema: swaggerResponseAsResultsArray,
		localJsonLdContext: "taxon-search"
	})
	@UseInterceptors(Translator, ResultsArray)
	getTripReportUnitShorthandAutocomplete(@Query() query: GetTripReportUnitShorthandDto) {
		return this.shorthandService.getTripReportUnitShorthand(query);
	}

	@Get("/unit/list")
	@UseInterceptors(SelectedFields)
	getTripReportUnitListAutocomplete(@Query() { query }: CommonAutocompleteDto) {
		return this.shorthandService.getTripReportUnitList(query);
	}

	@Get("/unit/line-transect")
	@ApiExtraModels(LineTransectUnitShorthandResponseDto)
	@ApiOkResponse({ schema: { $ref: getSchemaPath(LineTransectUnitShorthandResponseDto) } })
	@UseInterceptors(SelectedFields)
	getLineTransectUnitShorthandAutocomplete(@Query() { query }: CommonAutocompleteDto) {
		return this.shorthandService.getLineTransectUnitShorthand(query);
	}

	@Get("/unit/water-bird-pair-count")
	@ApiExtraModels(LineTransectUnitShorthandResponseDto)
	@ApiOkResponse({ schema: { $ref: getSchemaPath(LineTransectUnitShorthandResponseDto) } })
	@UseInterceptors(SelectedFields)
	getWaterbirdPairCountUnitShorthandAutocomplete(@Query() query: GetWaterBirdPairCountUnitShorthandDto) {
		return this.shorthandService.getWaterBirdPairCountUnitShorthand(query);
	}
}
