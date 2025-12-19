import { Body, Controller, Get, Post, Query, UseInterceptors } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { ApiUsersService } from "./api-users.service";
import { ApiUserCreateDto, GetApiUserDto } from "./dto/api-user.dto";
import { ApiUserEntity } from "./api-user.entity";
import { BypassAccessTokenAuth } from "src/decorators/bypass-access-token-auth.decorator";
import { Serializer } from "src/serialization/serializer.interceptor";
import { ErrorCodeException } from "src/utils";

@ApiTags("API user")
@Controller("api-user")
export class ApiUsersController {
	constructor(
		private readonly apiUsersService: ApiUsersService,
	) {}

	/** Returns info about an API user */
	@Get()
	@UseInterceptors(Serializer(ApiUserEntity, { filterNulls: true }))
	@ApiSecurity("access_token")
	getInfo(@Query() { accessToken }: GetApiUserDto) {
		if (!accessToken) {
			throw new ErrorCodeException("ACCESS_TOKEN_MISSING", 422);
		}
		return this.apiUsersService.getByAccessToken(accessToken);
	}

	/**
	 * Register as an api user. The access token will be sent to your email. You can use this endpoint to create a new
	 * access token in case you forget it. Note that it won't delete existing tokens.
	 * */
	@Post()
	@BypassAccessTokenAuth()
	register(@Body() user: ApiUserCreateDto) {
		return this.apiUsersService.create(user.email);
	}
}
