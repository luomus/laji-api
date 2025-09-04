import { Get, Query, UseInterceptors, Version } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, ApiTags, OpenAPIObject, getSchemaPath } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { AutocompleteService } from "./autocomplete.service";
import { CommonAutocompleteDto, GetFriendsDto, GetPersonsDto, GetPersonsResponseDto, GetTripReportUnitShorthandDto,
	GetWaterBirdPairCountUnitShorthandDto, LineTransectUnitShorthandResponseDto } from "./autocomplete.dto";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";
import { SelectedFields } from "src/interceptors/selected-fields.interceptor";
import { TaxaSearchDto } from "src/taxa/taxa.dto";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { ResultsArray, swaggerResponseAsResultsArray } from "src/interceptors/results-array.interceptor";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { Translator } from "src/interceptors/translator.interceptor";
import { SchemaItem } from "src/swagger/swagger.service";
import { JSONSchemaArray, JSONSchemaObject, JSONSchemaRef } from "src/json-schema.utils";
import { parseURIFragmentIdentifierRepresentation, pipe } from "src/utils";

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

const asTuple = (schema: SchemaItem, document: OpenAPIObject) => 
	[schema, document] as [JSONSchemaRef, OpenAPIObject];

const swaggerResponseWithKeyAndValue = ([refSchema, document]: [JSONSchemaRef, OpenAPIObject]) => {
	const schema: JSONSchemaArray = parseURIFragmentIdentifierRepresentation(document, refSchema.$ref);
	(schema.items as JSONSchemaObject).properties!.key = { type: "string" };
	(schema.items as JSONSchemaObject).properties!.value = { type: "string" };
	return refSchema;
};

@ApiTags("Autocomplete")
@LajiApiController("autocomplete")
export class AutocompleteController {

	constructor(private autocompleteService: AutocompleteService) {}

	@Get("/persons")
	@UseInterceptors(SelectedFields, Paginator)
	@Version("1")
	@ApiOkResponse(paginateSchema(GetPersonsResponseDto))
	getPersons(@Query() { query }: GetPersonsDto) {
		return this.autocompleteService.getPersons(query);
	}

	@Get("/friends")
	@UseInterceptors(SelectedFields, Paginator)
	@Version("1")
	@ApiOkResponse(paginateSchema(GetPersonsResponseDto))
	@ApiExtraModels(GetPersonsResponseDto)
	getFriends(@PersonToken() person: Person, @Query() { query }: GetFriendsDto) {
		return this.autocompleteService.getFriends(person, query);
	}

	@Get("/unit/list")
	@UseInterceptors(SelectedFields)
	@Version("1")
	@ApiOkResponse(paginateSchema(GetPersonsResponseDto))
	getTripReportUnitListAutocomplete(@Query() { query }: CommonAutocompleteDto) {
		return this.autocompleteService.getTripReportUnitList(query);
	}

	@Get("/unit/shorthand/trip-report")
	@UseInterceptors(SelectedFields)
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
	getTripReportUnitShorthandAutocomplete(@Query() query: GetTripReportUnitShorthandDto) {
		return this.autocompleteService.getTripReportUnitShorthand(query);
	}

	@Get("/unit/shorthand/line-transect")
	@UseInterceptors(SelectedFields)
	@Version("1")
	@ApiExtraModels(LineTransectUnitShorthandResponseDto)
	@ApiOkResponse({ schema: { $ref: getSchemaPath(LineTransectUnitShorthandResponseDto) } })
	getLineTransectUnitShorthandAutocomplete(@Query() { query }: CommonAutocompleteDto) {
		return this.autocompleteService.getLineTransectUnitShorthand(query);
	}

	@Get("/unit/shorthand/water-bird-pair-count")
	@UseInterceptors(SelectedFields)
	@Version("1")
	@ApiExtraModels(LineTransectUnitShorthandResponseDto)
	@ApiOkResponse({ schema: { $ref: getSchemaPath(LineTransectUnitShorthandResponseDto) } })
	getWaterbirdPairCountUnitShorthandAutocomplete(@Query() query: GetWaterBirdPairCountUnitShorthandDto) {
		return this.autocompleteService.getWaterBirdPairCountUnitShorthand(query);
	}

	@Get("/taxa")
	@UseInterceptors(SelectedFields, ResultsArray)
	@SwaggerRemoteRef({
		source: "laji-backend",
		ref: "TaxonSearchResponse",
		customizeResponseSchema: (schema, document) => pipe(
			swaggerResponseWithKeyAndValue,
			swaggerResponseAsResultsArray
		)(asTuple(schema, document)),
		jsonLdContext: "taxon-search",
		schemaDefinitionName: "TaxonAutocompleteResponse"
	})
	@Version("1")
	getTaxa(@Query() query: TaxaSearchDto) {
		return this.autocompleteService.getTaxa(query);
	}
}
