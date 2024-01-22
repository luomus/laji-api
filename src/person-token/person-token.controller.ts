import { Delete, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PersonTokenService } from "./person-token.service";
import { LajiApiController } from "src/decorators/laji-api-controller";

@LajiApiController("person-token")
@ApiTags("Person token")
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
