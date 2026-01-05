import { HttpException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PersonTokenService } from "src/authentication-event/authentication-event.service";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { decoratePerson, Person, Role } from "./person.dto";
import { serializeInto } from "src/serialization/serialization.utils";
import { CACHE_1_D, CACHE_5_MIN, LocalizedException, promisePipe } from "src/utils";
import { PersonTokenInfo } from "src/authentication-event/authentication-event.dto";

@Injectable()
export class PersonsService {
	constructor(
		private configService: ConfigService,
		private personTokenService: PersonTokenService,
		private triplestoreService: TriplestoreService
	) {}

	async getByToken(personToken: string) {
		if (personToken === this.configService.get("IMPORTER_TOKEN")) {
			return ImporterPerson;
		}

		let info: PersonTokenInfo;
		try {
			info = await this.personTokenService.getInfo(personToken);
		} catch (e) {
			throw new LocalizedException("PERSON_TOKEN_IS_INVALID", e.response.status);
		}
		const { personId } = info;
		if (personId === null) {
			throw new HttpException("No personId found for personToken", 404);
		}
		return this.get(personId);
	}

	async get(id: string) {
		return promisePipe(
			serializeInto(Person),
			decoratePerson
		)(this.triplestoreService.get(id, { cache: CACHE_5_MIN }));
	}

	async checkExistsByEmail(email: string) {
		const persons = await this.triplestoreService.count({
			type: "MA.person",
			predicate: "MA.emailAddress",
			object: email
		}, { cache: CACHE_5_MIN });

		if (persons === 0) {
			throw new HttpException("Account not found", 404);
		}
	}

	async isICTAdmin(personToken: string) {
		const person = await this.getByToken(personToken);
		return person.role?.includes(Role.Admin) || false;
	}

	findByIds(ids: string[]) {
		return this.triplestoreService.find<Person>(
			{ type: "MA.person", subject: ids.join(",") },
			{ cache: CACHE_5_MIN }
		);
	}

	getAll() {
		return this.triplestoreService.find<Person>(
			{ type: "MA.person" },
			{ cache: CACHE_1_D }
		);
	}
}

const ImporterPerson: Person = serializeInto(Person)({
	id: "IMPORTER",
	fullName: "Importer",
	emailAddress: "",
	"@context": "",
	role: [Role.Admin, Role.Import]
});
