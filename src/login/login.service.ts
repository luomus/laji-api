import { Inject, Injectable } from "@nestjs/common";
import { LajiAuthPersonGet } from "src/authentication-event/authentication-event.dto";
import { LAJI_AUTH_CLIENT } from "src/provider-tokens";
import { RestClientService } from "src/rest-client/rest-client.service";

@Injectable()
export class LoginService {
	constructor(
		@Inject(LAJI_AUTH_CLIENT) private lajiAuthClient: RestClientService<LajiAuthPersonGet>
	) {}

	getTmpToken(accessToken: string, offerPermanent: boolean) {
		return this.lajiAuthClient.get("app-login", { params: { access_token: accessToken, offerPermanent } });
	}

	checkTmpToken(accessToken: string, tmpToken: string) {
		return this.lajiAuthClient.post(
			"app-login/check",
			undefined,
			{ params: { access_token: accessToken, tmpToken } }
		);
	}
}
