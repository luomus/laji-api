import { Delete, Get, Param, Version, Headers, HttpCode } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiTags } from "@nestjs/swagger";
import { PersonTokenService } from "./authentication-event.service";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { BypassPersonTokenInterceptor } from "./bypass-person-token-interceptor.decorator";

@LajiApiController("authentication-event")
@ApiTags("Authentication event")
export class PersonTokenController {

	constructor(private personTokenService: PersonTokenService) {}

	@ApiExcludeEndpoint()
	@Get(":personToken")
	@BypassPersonTokenInterceptor()
	getInfoBackwardCompatible(@Param("personToken") personToken: string) {
		return this.personTokenService.getInfo(personToken);
	}

	/** Information about the authentication event of a person token */
	@Version("1")
	@Get()
	@BypassPersonTokenInterceptor()
	getInfo(@Headers("Person-Token") personToken: string) {
		return this.personTokenService.getInfo(personToken);
	}

	@ApiExcludeEndpoint()
	@Delete(":personToken")
	@BypassPersonTokenInterceptor()
	deleteBackwardCompatible(@Param("personToken") personToken: string) {
		return this.personTokenService.delete(personToken);
	}

	/** Delete authentication session of a person token */
	@Version("1")
	@Delete()
	@BypassPersonTokenInterceptor()
	@HttpCode(204)
	async delete(@Headers("Person-Token") personToken: string) {
		await this.personTokenService.delete(personToken);
	}
}
