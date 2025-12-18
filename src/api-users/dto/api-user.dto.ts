import { PickType } from "@nestjs/swagger";
import { ApiUserEntity } from "../api-user.entity";

export class GetApiUserDto {
	/** Access token which to return information from */
	accessToken: string;
}

export class ApiUserCreateDto extends PickType(ApiUserEntity, ["email"]) {}
