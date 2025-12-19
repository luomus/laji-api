import { PickType } from "@nestjs/swagger";
import { ApiUserEntity } from "../api-user.entity";

export class GetApiUserDto {
	/** Access token whose metadata is being queried (i.e. a token issued to another system or user, not the caller’s own authorization token). */
	accessToken: string;
}

export class ApiUserCreateDto extends PickType(ApiUserEntity, ["email"]) {}

export class ApiUserUpdateDto extends PickType(ApiUserEntity, ["systemID"]) {}
