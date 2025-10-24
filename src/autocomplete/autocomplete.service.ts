import { Injectable } from "@nestjs/common";
import { Person } from "src/persons/person.dto";
import { PersonsService } from "src/persons/persons.service";
import { ProfileService } from "src/profile/profile.service";
import { GetPersonsResponseDto, TaxonAutocompleteResponseDto }
	from "./autocomplete.dto";
import { TaxaService } from "src/taxa/taxa.service";
import { TaxaSearchDto, Taxon } from "src/taxa/taxa.dto";

@Injectable()
export class AutocompleteService {

	constructor(
		private personsService: PersonsService,
		private profileService: ProfileService,
		private taxaService: TaxaService
	) {}

	async getFriends(person: Person, query?: string) {
		return filterPersons(query, (await this.personsService.findByIds([
			person.id,
			...(await this.profileService.getByPersonOrCreate(person)).friends
		])).map(preparePersonAutocomplete));
	}

	async getPersons(query?: string) {
		return filterPersons(query, (await this.personsService.getAll()).map(preparePersonAutocomplete));
	}

	async getTaxa(query: TaxaSearchDto): Promise<TaxonAutocompleteResponseDto[]> {
		return (await this.taxaService.search(query)).map(prepareTaxon);
	}
}

const filterPersons = (query: string | undefined, persons: GetPersonsResponseDto[]) => {
	query = query?.toLowerCase();
	return typeof query === undefined
		? persons
		: persons.filter(p => p.value?.toLowerCase()?.includes(query!));
};

const preparePersonAutocomplete = (person: Person): GetPersonsResponseDto => ({
	key: person.id,
	value: person.group ? `${person.fullName} (${person.group})` : person.fullName,
	name: person.fullName,
	group: person.group
});

const prepareTaxon = (taxon: Taxon) => ({
	...taxon,
	key: taxon.id,
	value: taxon.matchingName
});
