import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { map, of, switchMap } from "rxjs";
import { PersonTokenService } from "src/person-token/person-token.service";
import { RestClientService, rethrowHttpException } from "src/rest-client/rest-client.service";
import { Person } from "./person.dto";

@Injectable()
export class PersonsService {
	constructor(
		@Inject("STORE_REST_CLIENT") private storeClient: RestClientService,
		private configService: ConfigService,
		private personTokenService: PersonTokenService
	) {}

	// TODOD cache
	findByToken(personToken: string) {
		if (personToken === this.configService.get("IMPORTER_TOKEN")) {
			return of(ImporterPerson);
		}
		return this.personTokenService.getInfo(personToken).pipe(
			switchMap(({ personId }) =>  
				this.storeClient.get<Person>(`person/${personId}`).pipe(
					rethrowHttpException(),
					map(exposePerson)
				)
			)
		);
	}

	// TODO
	isICTAdmin(personToken: string) {
		return true;
	}

	// TODO
	addFriendRequest(personToken: string, userId: string) {
	}

	// TODO
	acceptFriendRequest(personToken: string, userId: string) {
	}

	// TODO
	removeFriend(personToken: string, userId: string) {
	}
}

const ImporterPerson: Person = {
	id: "",
	fullName: "Importer",
	emailAddress: ""
};

function exposePerson(person: Person) {
	if (person.inheritedName && person.preferredName) {
		if (!person.fullName) {
			person.fullName = [person.preferredName, person.inheritedName].join(" ");
		}
		return person;
	}
}
