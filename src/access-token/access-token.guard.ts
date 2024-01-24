import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { AccessTokenService } from "./access-token.service";

@Injectable()
export class AccessTokenGuard implements CanActivate {
	constructor(
		private accessTokenService: AccessTokenService,
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
			throw new UnauthorizedException("access_token missing");
		}
		try {
			const access = await this.accessTokenService.findOne(accessToken);
			if (!access) {
				throw new UnauthorizedException("Invalid access token");
			}
		} catch (e) {
			throw new UnauthorizedException("Invalid access token");
		}
		return true;
	}
}
