import { Get, Query, UseInterceptors, Version } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { AutocompleteService } from "./autocomplete.service";
import { GetFriendsDto, GetPersonsResponseDto } from "./autocomplete.dto";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";
import { SelectedFields } from "src/interceptors/selected-fields.interceptor";
import { TaxaSearchDto } from "src/taxa/taxa.dto";
import { Paginator } from "src/interceptors/paginator.interceptor";

@ApiTags("Autocomplete")
@LajiApiController("autocomplete")
export class AutocompleteController {

	constructor(private autocompleteService: AutocompleteService) {}

	@Get("/friends")
	@UseInterceptors(SelectedFields, Paginator)
	@Version("1")
	@ApiOkResponse({
		schema: {
			type: "object",
			properties: {
				results: {
					type: "array",
					items:  { $ref: getSchemaPath(GetPersonsResponseDto) }
				}
			}
		}
	})
	@ApiExtraModels(GetPersonsResponseDto)
	getFriends(@PersonToken() person: Person, @Query() { query }: GetFriendsDto) {
		return this.autocompleteService.getFriends(person, query);
	}

	@Get("/person")
	@UseInterceptors(SelectedFields, Paginator)
	@Version("1")
	@ApiOkResponse({
		schema: {
			type: "object",
			properties: {
				results: {
					type: "array",
					items:  { $ref: getSchemaPath(GetPersonsResponseDto) }
				}
			}
		}
	})
	@ApiExtraModels(GetPersonsResponseDto)
	getPersons(@Query() { query }: GetFriendsDto) {
		return this.autocompleteService.getPersons(query);
	}

	// TODO pagination not working yet
	@Get("/taxon")
	@UseInterceptors(SelectedFields, Paginator)
	@Version("1")
	getTaxa(@Query() query: TaxaSearchDto) {
		return this.autocompleteService.getTaxa(query);
	}
}
