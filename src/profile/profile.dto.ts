import { JSONObject } from ".././type-utils";

export class Profile {
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
