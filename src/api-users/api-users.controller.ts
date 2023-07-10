import { Body, Controller, Get, HttpException, Post, Query, Req, UseInterceptors } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { AccessTokenService } from "src/access-token/access-token.service";
import { ApiUsersService } from "./api-users.service";
import { GetApiUserDto, ApiUserCreateDto } from "./dto/api-user.dto";
import { Request } from "express";
import { createQueryParamsInterceptor } from "src/interceptors/query-params/query-params.interceptor";
import { ApiUser } from "./api-user.entity";
import { serializeInto } from "src/type-utils";

@ApiSecurity("access_token")
@ApiTags("API user")
@Controller("api-users")
export class ApiUsersController {
	constructor(
		private readonly apiUsersService: ApiUsersService,
		private readonly accessTokenService: AccessTokenService
	) {}

	/*
	 * Get form permissions for a person
	 */
	@Get()
	@UseInterceptors(createQueryParamsInterceptor(undefined, ApiUser, { filterNulls: true }))
	getInfo(@Req() request: Request, @Query() { accessToken }: GetApiUserDto) {
		const token = accessToken || this.accessTokenService.getAccessTokenFromRequest(request);
		if (!token) {
			throw new HttpException("You must provide a token", 422);
		}
		return this.apiUsersService.getByAccessToken(token);
	}

	@Post()
	register(@Body() user: ApiUserCreateDto) {
		return this.apiUsersService.create(serializeInto(ApiUserCreateDto, { whitelist: ["email"] })(user));
	}

	@Post("renew")
	renew(@Body() user: ApiUserCreateDto) {
		return this.apiUsersService.renew(serializeInto(ApiUserCreateDto, { whitelist: ["email"] })(user));
	}
}
