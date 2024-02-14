import { HttpException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PersonTokenService } from "src/person-token/person-token.service";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { decoratePerson, Person, Role } from "./person.dto";
import { serializeInto } from "src/serializing/serializing";
import { promisePipe } from "src/utils";

const CACHE_5_MIN = 1000 * 60 * 5;

@Injectable()
export class PersonsService {
	constructor(
		private configService: ConfigService,
		private personTokenService: PersonTokenService,
		private triplestoreService: TriplestoreService
	) {}

	/** @throws HttpException */
	async getByToken(personToken: string) {
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
			this.triplestoreService.findOne(personId, { cache: CACHE_5_MIN }),
			serializeInto(Person),
			decoratePerson
		);
	}

	async isICTAdmin(personToken: string) {
		const person = await this.getByToken(personToken);
		return person.role?.includes(Role.Admin) || false;
	}
}

const ImporterPerson: Person = serializeInto(Person)({
	id: "",
	fullName: "Importer",
	emailAddress: "",
	"@context": "",
	role: [Role.Admin, Role.Import]
});
