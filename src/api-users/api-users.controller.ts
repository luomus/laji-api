import { Body, Controller, Get, Post, Query, Req, UseInterceptors } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { AccessTokenService } from "src/access-token/access-token.service";
import { ApiUsersService } from "./api-users.service";
import { GetApiUserDto, ApiUserCreateDto } from "./dto/api-user.dto";
import { Request } from "express";
import { ApiUserEntity } from "./api-user.entity";
import { serializeInto } from "src/serialization/serialization.utils";
import { BypassAccessTokenAuth } from "src/access-token/bypass-access-token-auth.decorator";
import { Serializer } from "src/serialization/serializer.interceptor";
import { LocalizedException } from "src/utils";
import { RequestAccessToken } from "src/decorators/request-access-token.decorator";

@ApiTags("API user")
@Controller("api-users")
export class ApiUsersController {
	constructor(
		private readonly apiUsersService: ApiUsersService,
		private readonly accessTokenService: AccessTokenService
	) {}

	/* Returns info about user based on the access token */
	@Get()
	@UseInterceptors(Serializer(ApiUserEntity, { filterNulls: true }))
	@ApiSecurity("access_token")
	getInfo(@Req() request: Request, @RequestAccessToken() accessToken: string) {
		if (!accessToken) {
			throw new LocalizedException("ACCESS_TOKEN_MISSING", 422);
		}
		return this.apiUsersService.getByAccessToken(accessToken);
	}

	/** Register as an api user (access token will be sent to your email) */
	@Post()
	@BypassAccessTokenAuth()
	register(@Body() user: ApiUserCreateDto) {
		return this.apiUsersService.create(serializeInto(ApiUserCreateDto, { whitelist: ["email"] })(user));
	}

	/** Requests new access token (will be sent to your email). Please note that this will not delete any existing tokens.  */
	@Post("renew")
	@BypassAccessTokenAuth()
	renew(@Body() user: ApiUserCreateDto) {
		return this.apiUsersService.renew(serializeInto(ApiUserCreateDto, { whitelist: ["email"] })(user));
	}
}
