import { Body, Delete, Get, HttpCode, Param, Post, Put, Query, Version } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiTags } from "@nestjs/swagger";
import { Profile } from "src/profile/profile.dto";
import { ProfileService } from "src/profile/profile.service";
import { Person, RemoveFriendDto } from "./person.dto";
import { PersonsService } from "./persons.service";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { Serialize } from "src/serialization/serialize.decorator";
import { PersonToken } from "src/decorators/person-token.decorator";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";

@LajiApiController("person")
@ApiTags("Person")
export class PersonsController {
	constructor(
		private readonly personsService: PersonsService,
		private readonly profileService: ProfileService
	) {}

	@ApiExcludeEndpoint()
	@Get(":personToken")
	findPersonByTokenBackwardCompatible(@Param("personToken") personToken: string) {
		return this.personsService.getByToken(personToken);
	}

	/** Find person by person token */
	@Version("1")
	@Get()
	findPersonByToken(@PersonToken() person: Person) {
		return person;
	}

	@ApiExcludeEndpoint()
	@Get(":personToken/profile")
	findProfileByPersonTokenBackwardCompatible(@Param("personToken") personToken: string) {
		return this.profileService.getByPersonTokenOrCreate(personToken);
	}

	/** Get profile */
	@Version("1")
	@Get("profile")
	@SwaggerRemoteRef({ source: "store", ref: "/profile", applyToRequest: false })
	findProfileByPersonToken(@PersonToken() person: Person) {
		return this.profileService.getByPersonOrCreate(person);
	}

	@ApiExcludeEndpoint()
	@Get("by-id/:personId")
	@Serialize(Person, { whitelist: ["id", "fullName", "group", "@context"] }, "SensitivePerson")
	async findPersonByPersonIdBackwardCompatible(@Param("personId") personId: string) {
		return this.personsService.getByPersonId(personId);
	}

	/** Find person by user id (this will not include email) */
	@Version("1")
	@Get(":id")
	@Serialize(Person, { whitelist: ["id", "fullName", "group", "@context"] }, "SensitivePerson")
	async findPersonByPersonId(@Param("id") id: string) {
		return this.personsService.getByPersonId(id);
	}

	@ApiExcludeEndpoint()
	@Get("by-id/:personId/profile")
	@Serialize(Profile, { whitelist: ["userID", "image", "profileDescription"] }, "SensitiveProfile")
	async getProfileByPersonIdBackwardCompatible(@Param("personId") personId: string) {
		return this.profileService.getByPersonIdOrCreate(personId);
	}

	/** Find profile by person id (this will only return small subset of the full profile) */
	@Version("1")
	@Get(":id/profile")
	@Serialize(Profile, { whitelist: ["userID", "image", "profileDescription"] }, "SensitiveProfile")
	async getProfileByPersonId(@Param("id") id: string) {
		return this.profileService.getByPersonIdOrCreate(id);
	}

	@ApiExcludeEndpoint()
	@Post(":personToken/profile")
	async createProfileBackwardCompatible(@Param("personToken") personToken: string, @Body() profile: Profile) {
		const { id } = await this.personsService.getByToken(personToken);
		return this.profileService.createWithPersonId(id, profile);
	}

	/** Create profile */
	@Version("1")
	@Post("profile")
	async createProfile(@PersonToken() person: Person, @Body() profile: Profile) {
		return this.profileService.createWithPersonId(person.id, profile);
	}

	@ApiExcludeEndpoint()
	@Put(":personToken/profile")
	async updateProfileBackwardCompatible(@Param("personToken") personToken: string, @Body() profile: Profile) {
		const { id } = await this.personsService.getByToken(personToken);
		return this.profileService.updateWithPersonId(id, profile);
	}

	/** Update profile */
	@Version("1")
	@Put("profile")
	@SwaggerRemoteRef({ source: "store", ref: "/profile", applyToRequest: false })
	async updateProfile(@PersonToken() person: Person, @Body() profile: Profile) {
		return this.profileService.updateWithPersonId(person.id, profile);
	}

	@ApiExcludeEndpoint()
	@Post(":personToken/friends/:friendPersonID")
	addFriendRequestBackwardCompatible(
		@Param("personToken") personToken: string, @Param("friendPersonID") friendPersonID: string
	) {
		return this.profileService.addFriendRequestWithPersonToken(personToken, friendPersonID);
	}

	/** Request person to be your friend */
	@Version("1")
	@Post("friends/:id")
	@SwaggerRemoteRef({ source: "store", ref: "/profile", applyToRequest: false })
	addFriendRequest(@PersonToken() person: Person, @Param("id") friendPersonID: string) {
		return this.profileService.addFriendRequest(person.id, friendPersonID);
	}

	@ApiExcludeEndpoint()
	@Put(":personToken/friends/:friendPersonID")
	acceptFriendRequestBackwardCompatible(
		@Param("personToken") personToken: string, @Param("friendPersonID") friendPersonID: string
	) {
		return this.profileService.acceptFriendRequest(personToken, friendPersonID);
	}

	/** Accept friend request */
	@Version("1")
	@Put("friends/:id")
	@SwaggerRemoteRef({ source: "store", ref: "/profile", applyToRequest: false })
	acceptFriendRequest(@PersonToken() person: Person, @Param("id") friendPersonID: string) {
		return this.profileService.acceptFriendRequest(person.id, friendPersonID);
	}

	@ApiExcludeEndpoint()
	@Delete(":personToken/friends/:friendPersonID")
	removeFriendBackwardCompatible(
		@Param("personToken") personToken: string,
		@Param("friendPersonID") friendPersonID: string,
		@Query() { block }: RemoveFriendDto
	) {
		return this.profileService.removeFriendWithPersonToken(personToken, friendPersonID, block);
	}

	/** Remove a friend request or a friend */
	@Version("1")
	@Delete("friends/:id")
	@SwaggerRemoteRef({ source: "store", ref: "/profile", applyToRequest: false })
	removeFriend(
		@PersonToken() person: Person,
		@Param("id") friendPersonID: string,
		@Query() { block }: RemoveFriendDto
	) {
		return this.profileService.removeFriend(person.id, friendPersonID, block);
	}


  /** Check if given email has an existing account */
  @Get("exists-by-email/:email")
	@HttpCode(204)
	async checkExistsByEmail(@Param("email") email: string) {
		await this.personsService.checkExistsByEmail(email);
	}
}
