import { HttpException, Injectable } from "@nestjs/common";
import { PersonTokenService } from "src/person-token/person-token.service";
import { StoreService } from "src/store/store.service";
import { Profile } from "./profile.dto";
import * as crypto from "crypto";
import { clientErrorToHttpException } from "src/rest-client/rest-client.service";

@Injectable()
export class ProfileService {
	constructor(
		private storeService: StoreService,
		private personTokenService: PersonTokenService) {}

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
		const _profile = copyProps.reduce((profile, prop) => {
			if (profile[prop] === undefined) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				(profile[prop] as any) = existingProfile![prop];
			}
			return profile;
		}, profile);

		return this.storeService.update("profile", _profile);
	}

	private create(personId: string, profile: Partial<Profile>) {
		profile.userID = personId;
		profile.profileKey = crypto.randomUUID().substr(0, 6);
		return this.storeService.create("profile", profile);
	}

	private async findByPersonId(personId: string) {
		const { member } = await this.storeService.query<Profile>("profile", `userID:"${personId}"`);
		return member[0];
	}
}
