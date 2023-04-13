import { HttpException, Injectable } from "@nestjs/common";
import { PersonTokenService } from "src/person-token/person-token.service";
import { StoreService } from "src/store/store.service";
import { Profile } from "./profile.dto";
import * as crypto from "crypto";
import { NotificationsService } from "src/notifications/notifications.service";
import { serializeInto } from "src/type-utils";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const equals = require("deep-equal");

@Injectable()
export class ProfileService {
	private storeProfileService = this.storeService.forResource<Profile>("profile", { serializeInto: Profile })

	constructor(
		private storeService: StoreService,
		private personTokenService: PersonTokenService,
		private notificationsService: NotificationsService) {
	}

	/**
	 * Get a profile or creates one if person doesn't have a profile yet.
	 */
	async getByPersonIdOrCreate(personId: string) {
		const profile = await this.findByPersonId(personId);
		return profile || this.create(personId, {})
	}

	async getByPersonTokenOrCreate(personToken: string) {
		const personId =  await this.personTokenService.getPersonIdFromToken(personToken);
		return this.getByPersonIdOrCreate(personId);
	}

	/**
	 * Create new profile, if person has no profile.
	 */
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

		return this.storeProfileService.update(nextProfile);
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

		const updated = await this.storeProfileService.update({
			...profile, friendRequests: [...friendRequests, personId]
		});
		this.notificationsService.add({ toPerson: friendID, friendRequest: personId });
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
		await this.storeProfileService.update(addFriend(friendProfile, personId));
		const updated = await this.storeProfileService.update(addFriend(profile, friendPersonId));
		this.notificationsService.add({ toPerson: friendPersonId, friendRequestAccepted: personId });
		return updated;

		function addFriend(profile: Profile, friendPersonId: string) {
			return {
				...profile,
				friends: [...profile.friends, friendPersonId],
				friendRequests: profile.friendRequests.filter((id: string) => id !== friendPersonId)
			}
		}
	}

	async removeFriend(personToken: string, friendPersonId: string, block: boolean) {
		const personId = await this.personTokenService.getPersonIdFromToken(personToken);
		const profile = await this.getByPersonIdOrCreate(personId);
		const friendProfile = await this.getByPersonId(friendPersonId)

		await this.storeProfileService.update(removeFriend(friendProfile, personId, false));
		return this.storeProfileService.update(removeFriend(profile, friendPersonId, block));

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
		profile.profileKey = crypto.randomUUID().substr(0, 6);
		return this.storeProfileService.create(profile);
	}

	private async getByPersonId(personId: string) {
		const profile = await this.findByPersonId(personId);
		if (!profile) {
			throw new HttpException(`Person ${personId} not found`, 404);
		}
		return profile;
	}

	private async findByPersonId(personId: string): Promise<Profile | undefined> {
		return this.storeProfileService.findOne(`userID:"${personId}"`);
	}

	private async findByProfileKey(profileKey: string): Promise<Profile | undefined> {
		return this.storeProfileService.findOne(`profileKey:"${profileKey}"`);
	}
}
