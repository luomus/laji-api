import { Body, Controller, Get, Post, Query, UseInterceptors } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { ApiUsersService } from "./api-users.service";
import { ApiUserCreateDto, GetApiUserDto } from "./dto/api-user.dto";
import { ApiUserEntity } from "./api-user.entity";
import { serializeInto } from "src/serialization/serialization.utils";
import { BypassAccessTokenAuth } from "src/access-token/bypass-access-token-auth.decorator";
import { Serializer } from "src/serialization/serializer.interceptor";
import { ErrorCodeException } from "src/utils";

@ApiTags("API user")
@Controller("api-user")
export class ApiUsersController {
	constructor(
		private readonly apiUsersService: ApiUsersService,
	) {}

	/* Returns info about user based on the access token */
	@Get()
	@UseInterceptors(Serializer(ApiUserEntity, { filterNulls: true }))
	@ApiSecurity("access_token")
	getInfo(@Query() { accessToken }: GetApiUserDto) {
		if (!accessToken) {
			throw new ErrorCodeException("ACCESS_TOKEN_MISSING", 422);
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
