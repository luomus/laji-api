import { PickType } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { JSONObject } from ".././type-utils";

export class Profile {
	@Expose() profileKey: string;
	@Expose() userID: string;
	@Expose() profileDescription: string;
	@Expose() personalCollectionIdentifier: string;
	@Expose() taxonExpertise: string[] = [];
	@Expose() taxonExpertiseNotes: string;
	@Expose() image: string;
	@Expose() friends: string[] = [];
	@Expose() blocked: string[] = [];
	@Expose() friendRequests: string[] = [];
	@Expose() settings: JSONObject = {};
}

export class PublicProfile extends PickType(Profile, ["userID", "profileKey", "image", "profileDescription"]) {}
