import { Injectable } from "@nestjs/common";
import { Person } from "src/persons/person.dto";
import { PersonsService } from "src/persons/persons.service";
import { ProfileService } from "src/profile/profile.service";
import { GetFriendsResponseDto } from "./autocomplete.dto";

@Injectable()
export class AutocompleteService {

	constructor(
		private personsService: PersonsService,
		private profileService: ProfileService
	) {}

	async getFriends(person: Person) {
		return (await this.personsService.findByIds([
			person.id,
			...(await this.profileService.getByPersonIdOrCreate(person.id)).friends
		])).map(prepareFriendAutocomplete);
	}
}

const prepareFriendAutocomplete = (person: Person): GetFriendsResponseDto => ({
	key: person.id,
	value: person.group ? `${person.fullName} (${person.group})` : person.fullName,
	payload: { name: person.fullName, group: person.group }
});
