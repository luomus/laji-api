import { HttpException, Inject, Injectable } from "@nestjs/common";
import { StoreService } from "src/store/store.service";
import { Profile } from "./profile.dto";
import { NotificationsService } from "src/notifications/notifications.service";
import { serializeInto } from "src/serialization/serialization.utils";
import * as equals from "fast-deep-equal";
import { Person } from "src/persons/person.dto";

@Injectable()
export class ProfileService {

	constructor(
		@Inject("STORE_RESOURCE_SERVICE") private store: StoreService<Profile>,
		private notificationsService: NotificationsService) {
	}

	/**
	 * Get a profile or creates one if person doesn't have a profile yet.
	 */
	async getByPersonOrCreate(person: Person) {
		const profile = await this.findByPerson(person);
		return profile || this.store.create({ userID: person.id });
	}

	/** Create a new profile, if person has no profile. */
	async create(person: Person, profile: Partial<Profile>): Promise<Profile> {
		if (await this.findByPerson(person)) {
			throw new HttpException("User already has a profile", 422);
		}
		return this.create(person, profile);
	}

	async update(person: Person, profile: Partial<Profile>) {
		const existingProfile = await this.findByPerson(person);
		if (!existingProfile) {
			throw new HttpException("Can't update profile that doesn't exist", 422);
		}
		const nextProfile = serializeInto(Profile)({ ...existingProfile, ...profile });
		const protectedKeys: (keyof Profile)[] = ["id", "userID", "friendRequests", "friends"];
		protectedKeys.forEach((key: keyof Profile) => {
			if (!equals(nextProfile[key], existingProfile[key])) {
				throw new HttpException(`${key} cannot be updated by this method`, 422);
			}
		});

		return this.store.update(nextProfile);
	}

	async addFriendRequest(person: Person, friend: Person) {
		const friendProfile = await this.getByPersonOrCreate(friend);
		const { friendRequests, blocked, friends, userID: friendID } = friendProfile;

		if ([friendRequests, blocked, friends].some(l => l.includes(person.id))) {
			throw new HttpException("Friend request already sent", 422);
		}

		const updated = await this.store.update({
			...friendProfile, friendRequests: [...friendRequests, person.id]
		});
		void this.notificationsService.add({ toPerson: friendID, friendRequest: person.id });
		return updated;
	}

	async acceptFriendRequest(person: Person, friend: Person) {
		await this.getByPerson(friend);
		const friendProfile = await this.getByPerson(friend);
		const profile = await this.getByPersonOrCreate(person);

		if (!profile.friendRequests.includes(friend.id)) {
			throw new HttpException("No friend request found", 422);
		}

		await this.store.update(addFriend(friendProfile, person));
		const updated = await this.store.update(addFriend(profile, friend));
		void this.notificationsService.add({ toPerson: friend.id, friendRequestAccepted: person.id });
		return updated;

		function addFriend(profile: Profile, friend: Person) {
			return {
				...profile,
				friends: [...profile.friends, friend.id],
				friendRequests: profile.friendRequests.filter((id: string) => id !== friend.id)
			};
		}
	}

	async removeFriend(person: Person, friendID: string, block: boolean) {
		const profile = await this.getByPersonOrCreate(person);
		const friendProfile = await this.findByPersonID(friendID);

		if (friendProfile) {
			await this.store.update(removeFriend(friendProfile, person.id, false));
		}
		return this.store.update(removeFriend(profile, friendID, block));

		function removeFriend(profile: Profile, removePersonID: string, block: boolean) {
			const removeFriendFilter = (f: string) => f !== removePersonID;
			return {
				...profile,
				friends: profile.friends.filter(removeFriendFilter),
				friendRequests: profile.friendRequests.filter(removeFriendFilter),
				blocked: block ? [...profile.blocked, removePersonID] : profile.blocked
			};
		}
	}

	private async getByPerson(person: Person) {
		const profile = await this.findByPerson(person);
		if (!profile) {
			throw new HttpException(`Person's ${person.id} profile not found`, 404);
		}
		return profile;
	}

	private async findByPerson(person: Person): Promise<Profile | undefined> {
		return this.store.findOne({ userID: person.id });
	}

	async findByPersonID(personID: string): Promise<Profile | undefined> {
		return this.store.findOne({ userID: personID });
	}
}
