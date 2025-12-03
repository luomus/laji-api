import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "src/request";
import { AccessTokenService } from "./access-token.service";
import { ApiUsersService } from "src/api-users/api-users.service";
import { ErrorCodeException } from "src/utils";
import { findAccessTokenFromRequest } from "src/access-token/access-token.service";

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

		const accessToken = findAccessTokenFromRequest(request);
		if (typeof accessToken !== "string") {
			throw new ErrorCodeException("ACCESS_TOKEN_MISSING", 401);
		}
		try {
			const accessTokenEntity = await this.accessTokenService.findOne(accessToken);
			if (!accessTokenEntity) {
				throw new ErrorCodeException("INVALID_ACCESS_TOKEN", 401);
			}
			request.accessToken = accessToken;
			request.apiUser = await this.apiUsersService.getByAccessToken(accessToken);
		} catch (e) {
			throw new ErrorCodeException("INVALID_ACCESS_TOKEN", 401);
		}
		return true;
	}
}
