import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { map, Observable, of, switchMap } from "rxjs";
import { PersonTokenService } from "src/person-token/person-token.service";
import { rethrowHttpException } from "src/rest-client/rest-client.service";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { Person, Role } from "./person.dto";
import { serializeInto } from "../type-utils";

@Injectable()
export class PersonsService {
	constructor(
		private configService: ConfigService,
		private personTokenService: PersonTokenService,
		private triplestoreService: TriplestoreService
	) {}

	// TODOD cache
	findByToken(personToken: string) {
		if (personToken === this.configService.get("IMPORTER_TOKEN")) {
			return of(ImporterPerson);
		}
		return this.personTokenService.getInfo(personToken).pipe(
			switchMap(({ personId }) =>  
				this.findByPersonId(personId)
			)
		);
	}

	findByPersonId(personId: string) {
		return this.triplestoreService.get(personId).pipe(
			rethrowHttpException(),
			// map(exposePerson)
			map(serializeInto(Person, { excludeExtraneousValues: true }))
		)
	}

	isICTAdmin(personToken: string) {
		return this.findByToken(personToken).pipe(map(person => person.role?.includes(Role.Admin) || false));
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
	emailAddress: "",
	"@context": ""
};

function exposePerson(person: Person) {
	if (person.inheritedName && person.preferredName && !person.fullName) {
		person.fullName = [person.preferredName, person.inheritedName].join(" ");
	}
	return person;
}
