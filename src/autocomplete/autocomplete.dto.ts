import { IntersectionType } from "@nestjs/swagger";
import { IsOptionalBoolean } from "src/serialization/serialization.utils";

export class IncludePayloadDto {
	@IsOptionalBoolean() includePayload?: boolean = false;
}

export class GetFriendsDto extends IntersectionType(IncludePayloadDto) {}

export class GetFriendsResponseDto {
	key: string;
	value?: string;
	payload?: GetFriendResponsePayloadDto;
};

export class GetFriendResponsePayloadDto {
	name?: string;
	group?: string;
}
