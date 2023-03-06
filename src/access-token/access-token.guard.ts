import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { AccessTokenService } from "./access-token.service";

@Injectable()
export class AccessTokenGuard implements CanActivate {
	constructor(private accessTokenService: AccessTokenService) {}

	async canActivate(context: ExecutionContext) {
		const request = context.switchToHttp().getRequest<Request>();
		const accessToken = request.query.access_token;
		if (typeof accessToken !== "string") {
			throw new UnauthorizedException();
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
