import { Get, Post, Query } from "@nestjs/common";
import { LoginService } from "./login.service";
import { CheckTmpTokenQueryDto, GetTmpTokenQueryDto } from "./login.dto";
import { RequestAccessToken } from "src/decorators/request-access-token.decorator";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";

@ApiTags("Login")
@LajiApiController("login")
export class LoginController {
	constructor(private loginService: LoginService) {}

	/** Get temp token and login url to be used for the user authentication */
	@Get()
	getTmpToken(@RequestAccessToken() accessToken: string, @Query() { offerPermanent }: GetTmpTokenQueryDto) {
		return this.loginService.getTmpToken(accessToken, offerPermanent);
	}

	/** Check if the user has authenticated */
	@Post("check")
	checkTmpToken(@RequestAccessToken() accessToken: string, @Query() { tmpToken }: CheckTmpTokenQueryDto) {
		return this.loginService.checkTmpToken(accessToken, tmpToken);
	}
}
