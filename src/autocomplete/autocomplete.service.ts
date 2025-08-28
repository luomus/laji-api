import { Injectable } from "@nestjs/common";
import { Person } from "src/persons/person.dto";
import { PersonsService } from "src/persons/persons.service";
import { ProfileService } from "src/profile/profile.service";
import { GetFriendsResponseDto } from "./autocomplete.dto";
import { TaxaService } from "src/taxa/taxa.service";
import { TaxaSearchDto } from "src/taxa/taxa.dto";

@Injectable()
export class AutocompleteService {

	constructor(
		private personsService: PersonsService,
		private profileService: ProfileService,
		private taxaService: TaxaService
	) {}

	async getFriends(person: Person, query?: string) {
		query = query?.toLowerCase();
		const friends = (await this.personsService.findByIds([
			person.id,
			...(await this.profileService.getByPersonIdOrCreate(person.id)).friends
		])).map(prepareFriendAutocomplete);
		return typeof query === "string"
			? friends.filter(f => f.value?.toLowerCase().includes(query!))
			: friends;
	}

	async getTaxa(query: TaxaSearchDto) {
		return this.taxaService.search(query);
	}
}

const prepareFriendAutocomplete = (person: Person): GetFriendsResponseDto => ({
	key: person.id,
	value: person.group ? `${person.fullName} (${person.group})` : person.fullName,
	name: person.fullName,
	group: person.group
});
