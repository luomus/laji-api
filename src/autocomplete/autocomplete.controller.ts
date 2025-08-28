import { Get, Query, UseInterceptors, Version } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { AutocompleteService } from "./autocomplete.service";
import { CommonAutocompleteDto, GetFriendsDto, GetPersonsResponseDto, GetUnitDto } from "./autocomplete.dto";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";
import { SelectedFields } from "src/interceptors/selected-fields.interceptor";
import { TaxaSearchDto } from "src/taxa/taxa.dto";
import { Paginator } from "src/interceptors/paginator.interceptor";

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
	// @UseInterceptors(SelectedFields, Paginator)
	@Version("1")
	@ApiOkResponse(paginateSchema(GetPersonsResponseDto))
	getUnit(@Query() { query }: CommonAutocompleteDto) {
		return this.autocompleteService.getTripReportUnitListAutocompleteService(query);
	}

	// TODO pagination not working yet
	@Get("/taxon")
	@UseInterceptors(SelectedFields, Paginator)
	@Version("1")
	getTaxa(@Query() query: TaxaSearchDto) {
		return this.autocompleteService.getTaxa(query);
	}
}
