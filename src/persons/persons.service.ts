import { HttpException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PersonTokenService } from "src/person-token/person-token.service";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { decoratePerson, Person, Role } from "./person.dto";
import { serializeInto } from "../type-utils";
import { promisePipe } from "src/utils";

const CACHE_5_MIN = 1000 * 60 * 5;

@Injectable()
export class PersonsService {
	constructor(
		private configService: ConfigService,
		private personTokenService: PersonTokenService,
		private triplestoreService: TriplestoreService
	) {}

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
			this.triplestoreService.find(personId, { cache: CACHE_5_MIN }),
			serializeInto(Person),
			decoratePerson
		)
	}

	async isICTAdmin(personToken: string) {
		const person = await this.findByToken(personToken);
		return person.role?.includes(Role.Admin) || false;
	}
}

const ImporterPerson: Person = {
	id: "",
	fullName: "Importer",
	emailAddress: "",
	"@context": ""
};
