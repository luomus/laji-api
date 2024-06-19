import { Body, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Profile } from "src/profile/profile.dto";
import { ProfileService } from "src/profile/profile.service";
import { Person, RemoveFriendDto } from "./person.dto";
import { PersonsService } from "./persons.service";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { Serialize } from "src/serializing/serialize.decorator";

@LajiApiController("person")
@ApiTags("Person")
export class PersonsController {
	constructor(
		private readonly personsService: PersonsService,
		private readonly profileService: ProfileService
	) {}

	/*
	 * Find person by person token
	 */
	@Get(":personToken")
	findPersonByToken(@Param("personToken") personToken: string) {
		return this.personsService.getByToken(personToken);
	}

	@Get(":personToken/profile")
	findProfileByPersonToken(@Param("personToken") personToken: string) {
		return this.profileService.getByPersonTokenOrCreate(personToken);
	}

	/*
	 * Find person by user id (this will not include email)
	 */
	@Get("by-id/:personId")
	@Serialize(Person, { whitelist: ["id", "fullName", "group", "@context"] }, "SensitivePerson")
	async findPersonByPersonId(@Param("personId") personId: string) {
		return this.personsService.getByPersonId(personId);
	}

	/*
	 * Find profile by user id (this will only return small subset of the full profile)
	 */
	@Get("by-id/:personId/profile")
	@Serialize(Profile, { whitelist: ["userID", "profileKey", "image", "profileDescription"] }, "SensitiveProfile")
	async getProfileByPersonId(@Param("personId") personId: string) {
		return this.profileService.getByPersonIdOrCreate(personId);
	}

	/*
	 * Create profile
	 */
	@Post(":personToken/profile")
	async createProfile(@Param("personToken") personToken: string, @Body() profile: Profile) {
		const { id } = await this.personsService.getByToken(personToken);
		return this.profileService.createWithPersonId(id, profile);
	}

	/*
	 * Update profile
	 */
	@Put(":personToken/profile")
	async updateProfile(@Param("personToken") personToken: string, @Body() profile: Profile) {
		const { id } =  await this.personsService.getByToken(personToken);
		return this.profileService.updateWithPersonId(id, profile);
	}

	/*
	 * Request person to be your friend
	 */
	@Post(":personToken/friends/:profileKey")
	addFriendRequest(@Param("personToken") personToken: string, @Param("profileKey") profileKey: string) {
		return this.profileService.addFriendRequest(personToken, profileKey);
	}

	/*
	 * Accept friend request
	 */
	@Put(":personToken/friends/:personId")
	acceptFriendRequest(@Param("personToken") personToken: string, @Param("personId") personId: string) {
		return this.profileService.acceptFriendRequest(personToken, personId);
	}

	/*
	 * Remove a friend request or a friend
	 */
	@Delete(":personToken/friends/:personId")
	removeFriend(
		@Param("personToken") personToken: string,
		@Param("personId") personId: string,
		@Query() { block }: RemoveFriendDto
	) {
		return this.profileService.removeFriend(personToken, personId, block);
	}
}
