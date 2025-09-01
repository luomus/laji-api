import { Injectable } from "@nestjs/common";
import { Person } from "src/persons/person.dto";
import { PersonsService } from "src/persons/persons.service";
import { ProfileService } from "src/profile/profile.service";
import { GetPersonsResponseDto, GetWaterBirdPairCountUnitShorthandDto } from "./autocomplete.dto";
import { TaxaService } from "src/taxa/taxa.service";
import { TaxaSearchDto } from "src/taxa/taxa.dto";
import { TripReportUnitListAutocompleteService } from "./trip-report-unit-list.autocomplete.service";
import { TripReportUnitShorthandAutocompleteService } from "./trip-report-unit-shorthand.autocomplete.service";
import { LineTransectUnitShorthandAutocompleteService } from "./line-transect-unit-shorthand.autocomplete.service";
import { WaterBirdPairCountUnitShorthandAutocompleteService }
	from "./water-bird-pair-count-unit-shorthand.autocomplete.service";

@Injectable()
export class AutocompleteService {

	constructor(
		private personsService: PersonsService,
		private profileService: ProfileService,
		private taxaService: TaxaService,
		private tripReportUnitListAutocompleteService: TripReportUnitListAutocompleteService,
		private tripReportUnitShorthandAutocompleteService: TripReportUnitShorthandAutocompleteService,
		private lineTransectUnitShorthandAutocompleteService: LineTransectUnitShorthandAutocompleteService,
		private waterBirdPairCountUnitShorthandAutocompleteService: WaterBirdPairCountUnitShorthandAutocompleteService
	) {}

	async getFriends(person: Person, query?: string) {
		return filterPersons(query, (await this.personsService.findByIds([
			person.id,
			...(await this.profileService.getByPersonIdOrCreate(person.id)).friends
		])).map(preparePersonAutocomplete));
	}

	async getPersons(query?: string) {
		return filterPersons(query, (await this.personsService.getAll()).map(preparePersonAutocomplete));
	}

	async getTaxa(query: TaxaSearchDto) {
		return this.taxaService.search(query);
	}

	async getTripReportUnitList(query?: string) {
		return this.tripReportUnitListAutocompleteService.autocomplete(query);
	}

	async getTripReportUnitShorthand({ query, ...params }: TaxaSearchDto) {
		return this.tripReportUnitShorthandAutocompleteService.autocomplete(query, params);
	}

	async getLineTransectUnitShorthand(query: string) {
		return this.lineTransectUnitShorthandAutocompleteService.autocomplete(query);
	}

	async getWaterBirdPairCountUnitShorthand({ query, ...options }: GetWaterBirdPairCountUnitShorthandDto) {
		return this.waterBirdPairCountUnitShorthandAutocompleteService.autocomplete(query, options);
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
