import { Get, Query, UseInterceptors, Version } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, ApiTags, OpenAPIObject, getSchemaPath } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { AutocompleteService } from "./autocomplete.service";
import { GetFriendsDto, GetPersonsDto, GetPersonsResponseDto } from "./autocomplete.dto";
import { RequestPerson }from "src/decorators/request-person.decorator";
import { Person } from "src/persons/person.dto";
import { SelectedFields } from "src/interceptors/selected-fields.interceptor";
import { TaxaSearchDto } from "src/taxa/taxa.dto";
import { ResultsArray, swaggerResponseAsResultsArray } from "src/interceptors/results-array.interceptor";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { Translator } from "src/interceptors/translator.interceptor";
import { SchemaItem } from "src/swagger/swagger.service";
import { JSONSchemaObject, JSONSchemaRef } from "src/json-schema.utils";
import { parseURIFragmentIdentifierRepresentation, pipe } from "src/utils";
import { Limit } from "src/interceptors/limit.interceptor";

const asTuple = (schema: SchemaItem, document: OpenAPIObject) =>
	[schema, document] as [JSONSchemaRef, OpenAPIObject];

const swaggerResponseWithKeyAndValue = ([refSchema, document]: [JSONSchemaRef, OpenAPIObject]) => {
	const schema: JSONSchemaObject = parseURIFragmentIdentifierRepresentation(document, refSchema.$ref);
	schema.properties!.key = { type: "string" };
	schema.properties!.value = { type: "string" };
	return refSchema;
};

@ApiTags("Autocomplete")
@LajiApiController("autocomplete")
export class AutocompleteController {

	constructor(private autocompleteService: AutocompleteService) {}

	@Version("1")
	@Get("/persons")
	@ApiOkResponse({ schema: swaggerResponseAsResultsArray({ $ref: getSchemaPath(GetPersonsResponseDto) }) })
	@UseInterceptors(SelectedFields, ResultsArray, Limit)
	getPersons(@Query() { query }: GetPersonsDto) {
		return this.autocompleteService.getPersons(query);
	}

	@Version("1")
	@Get("/friends")
	@ApiOkResponse({ schema: swaggerResponseAsResultsArray({ $ref: getSchemaPath(GetPersonsResponseDto) }) })
	@ApiExtraModels(GetPersonsResponseDto)
	@UseInterceptors(SelectedFields, ResultsArray, Limit)
	getFriends(@RequestPerson() person: Person, @Query() { query }: GetFriendsDto) {
		return this.autocompleteService.getFriends(person, query);
	}

	@Version("1")
	@Get("/taxa")
	@SwaggerRemoteRef({
		source: "laji-backend",
		ref: "/TaxonSearchResponse/items",
		customizeResponseSchema: (schema, document) => pipe(
			swaggerResponseWithKeyAndValue,
			swaggerResponseAsResultsArray
		)(asTuple(schema, document)),
		localJsonLdContext: "taxon-search",
		schemaDefinitionName: "TaxonAutocompleteResponse"
	})
	@UseInterceptors(Translator, ResultsArray, SelectedFields)
	getTaxa(@Query() query: TaxaSearchDto) {
		return this.autocompleteService.getTaxa(query);
	}
}
