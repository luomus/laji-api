import {PickType} from "@nestjs/swagger"
import {ApiUser} from "../api-user.entity"

export class GetApiUserDto {
	/**
	 * access token which to return information from
	 */
	accessToken?: string
}

export class ApiUserCreateDto extends PickType(ApiUser, ["email"]) {}
