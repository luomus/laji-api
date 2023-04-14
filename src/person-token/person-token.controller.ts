import { Controller, Delete, Get, Param } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { PersonTokenService } from "./person-token.service";

@ApiSecurity("access_token")
@Controller("person-token")
@ApiTags("person-token")
export class PersonTokenController {

	constructor(private personTokenService: PersonTokenService) {}

	/*
	 * Returns information about the token
	 */
	@Get(":personToken")
	getInfo(@Param("personToken") personToken: string) {
		return this.personTokenService.getInfo(personToken);
	}

	/*
	 * Deletes the token
	 */
	@Delete(":personToken")
	delete(@Param("personToken") personToken: string) {
		return this.personTokenService.delete(personToken);
	}
}
