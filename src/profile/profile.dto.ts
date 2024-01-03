import { JSONObject } from "../type-utils";

export class Profile {
	id: string;
	profileKey: string;
	userID: string;
	profileDescription: string;
	personalCollectionIdentifier: string;
	taxonExpertise: string[] = [];
	taxonExpertiseNotes: string;
	image: string;
	friends: string[] = [];
	blocked: string[] = [];
	friendRequests: string[] = [];
	settings: JSONObject = {};
}
