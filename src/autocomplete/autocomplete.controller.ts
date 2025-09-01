import { Get, Query, UseInterceptors, Version } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { AutocompleteService } from "./autocomplete.service";
import { CommonAutocompleteDto, GetFriendsDto, GetPersonsResponseDto, GetTripReportUnitShorthandDto, GetUnitDto } from "./autocomplete.dto";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";
import { SelectedFields } from "src/interceptors/selected-fields.interceptor";
import { TaxaSearchDto } from "src/taxa/taxa.dto";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { ResultsArray, swaggerResponseAsResultsArray } from "src/interceptors/results-array.interceptor";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { Translator } from "src/interceptors/translator.interceptor";

const paginateSchema = (resultSchemaDto: any) => ({
	schema: {
		type: "object",
		properties: {
			results: {
				type: "array",
				items:  { $ref: getSchemaPath(resultSchemaDto) }
			},
			total: { type: "number" },
			pageSize: { type: "number" },
			currentPage: { type: "number" },
			lastPage: { type: "number" },
			"@context": { type: "string" },
		}
	}
});

@ApiTags("Autocomplete")
@LajiApiController("autocomplete")
export class AutocompleteController {

	constructor(private autocompleteService: AutocompleteService) {}

	@Get("/friends")
	@UseInterceptors(SelectedFields, Paginator)
	@Version("1")
	@ApiOkResponse(paginateSchema(GetPersonsResponseDto))
	@ApiExtraModels(GetPersonsResponseDto)
	getFriends(@PersonToken() person: Person, @Query() { query }: GetFriendsDto) {
		return this.autocompleteService.getFriends(person, query);
	}

	@Get("/person")
	@UseInterceptors(SelectedFields, Paginator)
	@Version("1")
	@ApiOkResponse(paginateSchema(GetPersonsResponseDto))
	getPersons(@Query() { query }: GetFriendsDto) {
		return this.autocompleteService.getPersons(query);
	}

	@Get("/unit/list")
	@Version("1")
	@ApiOkResponse(paginateSchema(GetPersonsResponseDto))
	getTripReportUnitListAutocompleteService(@Query() { query }: CommonAutocompleteDto) {
		return this.autocompleteService.getTripReportUnitList(query);
	}

	@Get("/unit/shorthand")
	@Version("1")
	@ApiOkResponse(paginateSchema(GetPersonsResponseDto))
	// The json-ld typing is actually more than just taxon response, but this is sufficient to get the taxon search
	// results translated.
	@SwaggerRemoteRef({
		source: "laji-backend",
		ref: "TaxonSearchResponse",
		customizeResponseSchema: swaggerResponseAsResultsArray,
		jsonLdContext: "taxon-search"
	})
	@UseInterceptors(Translator, ResultsArray)
	getTripReportUnitShorthandAutocompleteService(@Query() query: GetTripReportUnitShorthandDto) {
		return this.autocompleteService.getTripReportUnitShorthand(query);
	}

	// TODO pagination not working yet
	@Get("/taxon")
	@UseInterceptors(SelectedFields, Paginator)
	@Version("1")
	getTaxa(@Query() query: TaxaSearchDto) {
		return this.autocompleteService.getTaxa(query);
	}
}
