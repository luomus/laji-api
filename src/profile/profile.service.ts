import { HttpException, Injectable } from "@nestjs/common";
import { PersonTokenService } from "src/person-token/person-token.service";
import { StoreService } from "src/store/store.service";
import { Profile } from "./profile.dto";
import * as crypto from "crypto";
import { NotificationsService } from "src/notifications/notifications.service";

@Injectable()
export class ProfileService {
	constructor(
		private storeService: StoreService,
		private personTokenService: PersonTokenService,
		private notificationsService: NotificationsService) {}

	/*
	 * Get a profile or creates one if person doesn't have a profile yet.
	 */
	async getByPersonId(personId: string) {
		const profile = await this.findByPersonId(personId);
		return profile || this.create(personId, {})
	}

	async findByPersonToken(personToken: string) {
		const { personId } = await this.personTokenService.getInfo(personToken);
		if (personId === null) {
			throw new HttpException("No personId found for personToken", 404);
		}
		return this.getByPersonId(personId);
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

	async updateWithPersonId(personId: string, profile: Profile) {
		let existingProfile = await this.findByPersonId(personId);
		if (!existingProfile) {
			existingProfile = await this.create(personId, profile);
		}

		const copyProps: (keyof Profile)[] = ["friends","friendRequests", "userID", "profileKey"];
		const updatedProfile = copyProps.reduce((profile, prop) => {
			if (profile[prop] === undefined) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				(profile[prop] as any) = existingProfile![prop];
			}
			return profile;
		}, profile);

		return this.update(updatedProfile);
	}

	async addFriendRequest(personToken: string, profileKey: string) {
		const { personId } =  await this.personTokenService.getInfo(personToken);
		if (!personId) {
			throw new HttpException("No personId found for personToken", 404);
		}

		const profile = await this.findByProfileKey(profileKey);
		const { friendRequests, blocked, friends, userID: friendID } = profile;
		if ([friendRequests, blocked, friends].some(l => l.includes(personId))) {
			throw new HttpException("Friend request already sent", 422);
		}

		const updated = await this.update({ ...profile, friendRequests: [...friendRequests, personId] });
		this.notificationsService.add({ toPerson: friendID, friendRequest: personId });
		return updated;
	}

	async acceptFriendRequest(personToken: string, friendPersonId: string) {
		const { personId } =  await this.personTokenService.getInfo(personToken);
		if (!personId) {
			throw new HttpException("No personId found for personToken", 404);
		}

		const profile = await this.findByProfileKey(personId);
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

	private create(personId: string, profile: Partial<Profile>) {
		profile.userID = personId;
		profile.profileKey = crypto.randomUUID().substr(0, 6);
		return this.storeService.create("profile", profile);
	}

	private update(profile: Profile) {
		return this.storeService.update("profile", profile);
	}

	private async findByPersonId(personId: string) {
		const { member } = await this.storeService.query<Profile>("profile", `userID:"${personId}"`);
		return member[0];
	}

	private async findByProfileKey(profileKey: string) {
		const { member } = await this.storeService.query<Profile>("profile", `profileKey:"${profileKey}"`);
		return member[0];
	}
}
