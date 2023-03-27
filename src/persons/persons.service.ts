import { HttpException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PersonTokenService } from "src/person-token/person-token.service";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { decoratePerson, Person, Role } from "./person.dto";
import { serializeInto } from "../type-utils";
import { promisePipe } from "src/utils";

@Injectable()
export class PersonsService {
	constructor(
		private configService: ConfigService,
		private personTokenService: PersonTokenService,
		private triplestoreService: TriplestoreService
	) {}

	// TODOD cache
	async findByToken(personToken: string) {
		if (personToken === this.configService.get("IMPORTER_TOKEN")) {
			return ImporterPerson;
		}

		const { personId } = await this.personTokenService.getInfo(personToken);
		if (personId === null) {
			throw new HttpException("No personId found for personToken", 404);
		}
		return this.findByPersonId(personId);
	}

	async findByPersonId(personId: string) {
		return promisePipe(
			this.triplestoreService.get(personId),
			serializeInto(Person),
			decoratePerson
		)
	}

	async isICTAdmin(personToken: string) {
		const person = await this.findByToken(personToken);
		return person.role?.includes(Role.Admin) || false;
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
