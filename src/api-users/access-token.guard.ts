import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "src/request";
import { ApiUsersService } from "src/api-users/api-users.service";
import { ErrorCodeException } from "src/utils";

@Injectable()
export class AccessTokenGuard implements CanActivate {
	constructor(
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
			const apiUser = await this.apiUsersService.getByAccessToken(accessToken);
			if (!apiUser) {
				throw new ErrorCodeException("INVALID_ACCESS_TOKEN", 401);
			}
			request.accessToken = accessToken;
			request.apiUser = apiUser;
		} catch (e) {
			throw new ErrorCodeException("INVALID_ACCESS_TOKEN", 401);
		}
		return true;
	}
}

export const findAccessTokenFromRequest = (request: Request): string | undefined => {
	if (request.query.access_token) {
		if (request.headers["api-version"] === "1") {
			// eslint-disable-next-line max-len
			throw new ErrorCodeException("BAD_ACCESS_TOKEN_SIGNATURE", 422);
		}
		return request.query.access_token as string;
	}
	const { authorization } = request.headers;
	if (authorization) {
		return authorization.replace("Bearer ", "").replace("bearer ", "");
	}
	return (request.query.access_token as string) || request.headers.authorization;
};
