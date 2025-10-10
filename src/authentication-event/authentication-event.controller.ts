import { Delete, Get, Param, Version, Headers } from "@nestjs/common";
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

	/*
	 * Returns information about the token
	 */
	@Version("1")
	@Get()
	@BypassPersonTokenInterceptor()
	getInfo(@Headers("person-token") personToken: string) {
		return this.personTokenService.getInfo(personToken);
	}

	@ApiExcludeEndpoint()
	@Delete(":personToken")
	@BypassPersonTokenInterceptor()
	deleteBackwardCompatible(@Param("personToken") personToken: string) {
		return this.personTokenService.delete(personToken);
	}

	/*
	 * Deletes the token
	 */
	@Version("1")
	@Delete()
	@BypassPersonTokenInterceptor()
	delete(@Headers("person-token") personToken: string) {
		return this.personTokenService.delete(personToken);
	}
}
