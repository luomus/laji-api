import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "src/request";
import { AccessTokenService } from "./access-token.service";
import { ApiUsersService } from "src/api-users/api-users.service";
import { LocalizedException } from "src/utils";

@Injectable()
export class AccessTokenGuard implements CanActivate {
	constructor(
		private accessTokenService: AccessTokenService,
		private apiUsersService: ApiUsersService,
		private reflector: Reflector
	) {}

	async canActivate(context: ExecutionContext) {
		const request = context.switchToHttp().getRequest<Request>();
		const bypass = this.reflector.get<boolean>("BypassAccessTokenAuth", context.getHandler());
		if (bypass) {
			return true;
		}

		const accessToken = this.accessTokenService.findAccessTokenFromRequest(request);
		if (typeof accessToken !== "string") {
			throw new LocalizedException("ACCESS_TOKEN_MISSING", 401);
		}
		try {
			const accessTokenEntity = await this.accessTokenService.findOne(accessToken);
			if (!accessTokenEntity) {
				throw new LocalizedException("INVALID_ACCESS_TOKEN", 401);
			}
			request.accessToken = accessToken;
			request.apiUser = await this.apiUsersService.getByAccessToken(accessToken);
		} catch (e) {
			throw new LocalizedException("INVALID_ACCESS_TOKEN", 401);
		}
		return true;
	}
}
