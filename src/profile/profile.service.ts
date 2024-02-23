import { HttpException, Inject, Injectable } from "@nestjs/common";
import { PersonTokenService } from "src/person-token/person-token.service";
import { StoreService } from "src/store/store.service";
import { Profile } from "./profile.dto";
import { NotificationsService } from "src/notifications/notifications.service";
import { serializeInto } from "src/serializing/serializing";
import * as equals from "fast-deep-equal";
import { uuid } from "src/utils";
import { RestClientService } from "src/rest-client/rest-client.service";

@Injectable()
export class ProfileService {

	private store = new StoreService(this.storeClient, { resource: "profile", serializeInto: Profile });

	constructor(
		@Inject("STORE_REST_CLIENT") private storeClient: RestClientService,
		private personTokenService: PersonTokenService,
		private notificationsService: NotificationsService) {
	}

	/**
	 * Get a profile or creates one if person doesn't have a profile yet.
	 */
	async getByPersonIdOrCreate(personId: string) {
		const profile = await this.findByPersonId(personId);
		return profile || this.create(personId, {});
	}

	async getByPersonTokenOrCreate(personToken: string) {
		const personId =  await this.personTokenService.getPersonIdFromToken(personToken);
		return this.getByPersonIdOrCreate(personId);
	}

	/** Create a new profile, if person has no profile. */
	async createWithPersonId(personId: string, profile: Partial<Profile>): Promise<Profile> {
		let existingProfile: Profile | undefined;
		try {
			existingProfile = await this.findByPersonId(personId);
		} catch (e) {
			if (e.response?.status !== 404) {
				throw e;
			}
		}

		if (existingProfile) {
			throw new HttpException("User already has a profile", 422);
		}

		return this.create(personId, profile);
	}

	async updateWithPersonId(personId: string, profile: Partial<Profile>) {
		const existingProfile = await this.findByPersonId(personId);
		if (!existingProfile) {
			throw new HttpException("Can't update profile that doesn't exist", 422);
		}
		const nextProfile = serializeInto(Profile)({ ...existingProfile, ...profile });
		const protectedKeys: (keyof Profile)[] = ["id", "userID", "profileKey", "friendRequests", "friends"];
		protectedKeys.forEach((key: keyof Profile) => {
			if (!equals(nextProfile[key], existingProfile[key])) {
				throw new HttpException(`${key} cannot be updated by this method`, 422);
			}
		});

		return this.store.update(nextProfile);
	}

	async addFriendRequest(personToken: string, profileKey: string) {
		const personId =  await this.personTokenService.getPersonIdFromToken(personToken);
		const profile = await this.findByProfileKey(profileKey);
		if (!profile) {
			throw new HttpException("Profile not found", 404);
		}
		const { friendRequests, blocked, friends, userID: friendID } = profile;

		if ([friendRequests, blocked, friends].some(l => l.includes(personId))) {
			throw new HttpException("Friend request already sent", 422);
		}

		const updated = await this.store.update({
			...profile, friendRequests: [...friendRequests, personId]
		});
		void this.notificationsService.add({ toPerson: friendID, friendRequest: personId });
		return updated;
	}

	async acceptFriendRequest(personToken: string, friendPersonId: string) {
		await this.getByPersonId(friendPersonId);
		const personId = await this.personTokenService.getPersonIdFromToken(personToken);
		const friendProfile = await this.getByPersonId(friendPersonId);
		const profile = await this.getByPersonIdOrCreate(personId);

		if (!profile.friendRequests.includes(friendPersonId)) {
			throw new HttpException("No friend request found", 422);
		}

		await this.store.update(addFriend(friendProfile, personId));
		const updated = await this.store.update(addFriend(profile, friendPersonId));
		void this.notificationsService.add({ toPerson: friendPersonId, friendRequestAccepted: personId });
		return updated;

		function addFriend(profile: Profile, friendPersonId: string) {
			return {
				...profile,
				friends: [...profile.friends, friendPersonId],
				friendRequests: profile.friendRequests.filter((id: string) => id !== friendPersonId)
			};
		}
	}

	async removeFriend(personToken: string, friendPersonId: string, block: boolean) {
		const personId = await this.personTokenService.getPersonIdFromToken(personToken);
		const profile = await this.getByPersonIdOrCreate(personId);
		const friendProfile = await this.getByPersonId(friendPersonId);

		await this.store.update(removeFriend(friendProfile, personId, false));
		return this.store.update(removeFriend(profile, friendPersonId, block));

		function removeFriend(profile: Profile, removePersonId: string, block: boolean) {
			const removeFriendFilter = (f: string) => f !== removePersonId;
			return {
				...profile,
				friends: profile.friends.filter(removeFriendFilter),
				friendRequests: profile.friendRequests.filter(removeFriendFilter),
				blocked: block ? [...profile.blocked,  removePersonId] : profile.blocked
			};
		}
	}

	private create(personId: string, profile: Partial<Profile>) {
		profile.userID = personId;
		profile.profileKey = uuid(6);
		return this.store.create(profile);
	}

	private async getByPersonId(personId: string) {
		const profile = await this.findByPersonId(personId);
		if (!profile) {
			throw new HttpException(`Person ${personId} not found`, 404);
		}
		return profile;
	}

	private async findByPersonId(personId: string): Promise<Profile | undefined> {
		return this.store.findOne({ userID: personId });
	}

	private async findByProfileKey(profileKey: string): Promise<Profile | undefined> {
		return this.store.findOne({ profileKey });
	}
}
