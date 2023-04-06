import { HttpException, Injectable } from "@nestjs/common";
import { PersonTokenService } from "src/person-token/person-token.service";
import { StoreService } from "src/store/store.service";
import { Profile } from "./profile.dto";
import * as crypto from "crypto";
import { NotificationsService } from "src/notifications/notifications.service";
import equals from "deep-equal";

@Injectable()
export class ProfileService {
	constructor(
		private storeService: StoreService,
		private personTokenService: PersonTokenService,
		private notificationsService: NotificationsService) {}

	/*
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

	/*
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
		const nextProfile = { ...existingProfile, ...profile };
		const protectedKeys: (keyof Profile)[] = ["userID", "profileKey", "friendRequests"];
		protectedKeys.forEach((key: keyof Profile) => {
			if (!equals(nextProfile[key], existingProfile[key])) {
				throw new HttpException(`${key} cannot be updated by this method`, 422);
			}
		});

		return this.update(nextProfile);
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

		const updated = await this.update({ ...profile, friendRequests: [...friendRequests, personId] });
		this.notificationsService.add({ toPerson: friendID, friendRequest: personId });
		return updated;
	}

	async acceptFriendRequest(personToken: string, friendPersonId: string) {
		await this.getByPersonId(friendPersonId);
		const personId = await this.personTokenService.getPersonIdFromToken(personToken);
		const profile = await this.getByPersonIdOrCreate(personId);

		const { friendRequests, friends } = profile;
		const idx = friendRequests.indexOf(personId);
		if (idx === -1) {
			throw new HttpException("No friend request found", 422);
		}
		friendRequests.splice(idx, 1);
		!friends.includes(friendPersonId) && friends.push(friendPersonId);

		const updated = await this.update({ ...profile, friendRequests, friends });
		this.notificationsService.add({ toPerson: friendPersonId, friendRequestAccepted: personId });
		return updated;
	}

	async removeFriend(personToken: string, friendPersonId: string, block: boolean) {
		const personId = await this.personTokenService.getPersonIdFromToken(personToken);
		const profile = await this.getByPersonIdOrCreate(personId);
		const friendProfile = await this.getByPersonId(friendPersonId)

		await this.update(removeFriend(friendProfile, personId, false));
		return this.update(removeFriend(profile, friendPersonId, block));

		function removeFriend(profile: Profile, removePersonId: string, block: boolean) {
			const removeFriendFilter = (f: string) => f !== removePersonId;
			return {
				...profile,
				friends: profile.friends.filter(removeFriendFilter),
				friendRequests: profile.friends.filter(removeFriendFilter),
				blocked: block ? [...profile.blocked,  removePersonId] : profile.blocked
			};
		}
	}


	private create(personId: string, profile: Partial<Profile>) {
		profile.userID = personId;
		profile.profileKey = crypto.randomUUID().substr(0, 6);
		return this.storeService.create("profile", profile);
	}

	private update(profile: Profile) {
		return this.storeService.update("profile", profile);
	}

	private async getByPersonId(personId: string) {
		const person = await this.findByPersonId(personId);
		if (!person) {
			throw new HttpException(`Person ${personId} not found`, 404);
		}
		return person;
	}

	private async findByPersonId(personId: string): Promise<Profile | undefined> {
		const { member } = await this.storeService.query<Profile>("profile", `userID:"${personId}"`);
		return member[0];
	}

	private async findByProfileKey(profileKey: string): Promise<Profile | undefined> {
		const { member } = await this.storeService.query<Profile>("profile", `profileKey:"${profileKey}"`);
		return member[0];
	}
}
