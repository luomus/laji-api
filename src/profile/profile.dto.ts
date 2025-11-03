import { ApiPropertyOptional } from "@nestjs/swagger";
import { JSONObjectSerializable } from "../typing.utils";

export class Profile {
	id: string;
	userID: string;
	profileDescription: string;
	personalCollectionIdentifier: string;
	taxonExpertise: string[] = [];
	taxonExpertiseNotes: string;
	image: string;
	friends: string[] = [];
	blocked: string[] = [];
	friendRequests: string[] = [];

	@ApiPropertyOptional({
		type: "object",
		additionalProperties: true
	})
	settings: JSONObjectSerializable = {};
}
