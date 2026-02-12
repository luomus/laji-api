import { Body, Get, HttpException, Param, Post, Put, Query, UseGuards, UseInterceptors }
	from "@nestjs/common";
import { ApiBody, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { ApiUsersService } from "./api-users.service";
import { ApiUserCreateDto, ApiUserUpdateDto, GetApiUserDto } from "./dto/api-user.dto";
import { ApiUserEntity } from "./api-user.entity";
import { BypassAccessTokenAuth } from "src/decorators/bypass-access-token-auth.decorator";
import { Serializer } from "src/serialization/serializer.interceptor";
import { ErrorCodeException } from "src/utils";
import { IctAdminGuard } from "src/persons/ict-admin/ict-admin.guard";
import { RequestPerson } from "src/decorators/request-person.decorator";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";

@ApiTags("API user")
@LajiApiController("api-user")
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
	 */
	@Post()
	@BypassAccessTokenAuth()
	@ApiBody({
		schema: {
			example: {
				email: "enter-your-email-here-and-press-execute@email.com",
			},
		},
	})
	register(@Body() user: ApiUserCreateDto) {
		return this.apiUsersService.create(user.email);
	}

	/** Assing a systemID for an access token. Available only for ICT admins. */
	@Put(":email")
	@UseGuards(IctAdminGuard)
	@BypassAccessTokenAuth()
	update(@Param("email") email: string, @Body() { systemID }: ApiUserUpdateDto, @RequestPerson() _: never) {
		if (!systemID) {
			throw new HttpException("systemID is required", 400);
		}
		return this.apiUsersService.assignSystemID(email, systemID);
	}
}
