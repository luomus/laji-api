import { Body, Delete, Get, HttpCode, Param, Post, Put, Query, Version } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiTags } from "@nestjs/swagger";
import { Profile } from "src/profile/profile.dto";
import { ProfileService } from "src/profile/profile.service";
import { Person, RemoveFriendDto } from "./person.dto";
import { PersonsService } from "./persons.service";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { Serialize } from "src/serialization/serialize.decorator";
import { RequestPerson } from "src/decorators/request-person.decorator";
import { SwaggerRemote } from "src/swagger/swagger-remote.decorator";

@LajiApiController("person")
@ApiTags("Person")
export class PersonsController {
	constructor(
		private readonly personsService: PersonsService,
		private readonly profileService: ProfileService
	) {}

	/** Get profile */
	@Version("1")
	@Get("profile")
	@SwaggerRemote({ source: "store", ref: "/profile", applyToRequest: false })
	findProfileByPersonToken(@RequestPerson() person: Person) {
		return this.profileService.getByPersonOrCreate(person);
	}

	/** Find person by user id (this will not include email) */
	@Version("1")
	@Get(":id")
	@Serialize(Person, { whitelist: ["id", "fullName", "group", "@context"] }, "SensitivePerson")
	async findPersonByPersonId(@Param("id") id: string) {
		return this.personsService.get(id);
	}

	/** Find person by person token */
	@Version("1")
	@Get()
	findPersonByToken(@RequestPerson() person: Person) {
		return person;
	}

	/** Find profile by person id (this will only return small subset of the full profile) */
	@Version("1")
	@Get(":id/profile")
	@Serialize(Profile, { whitelist: ["userID", "image", "profileDescription"] }, "SensitiveProfile")
	async getProfileByPersonId(@Param("id") id: string) {
		return this.profileService.getByPersonOrCreate(await this.personsService.get(id));
	}

	/** Create profile */
	@Version("1")
	@Post("profile")
	@SwaggerRemote({ source: "store", ref: "/profile" })
	async createProfile(@RequestPerson() person: Person, @Body() profile: Profile) {
		return this.profileService.create(person, profile);
	}

	/** Accept friend request */
	@Version("1")
	@Put("friends/:id")
	@SwaggerRemote({ source: "store", ref: "/profile", applyToRequest: false })
	async acceptFriendRequest(@RequestPerson() person: Person, @Param("id") friendPersonID: string) {
		return this.profileService.acceptFriendRequest(person, await this.personsService.get(friendPersonID));
	}

	/** Remove a friend request or a friend */
	@Version("1")
	@Delete("friends/:id")
	@SwaggerRemote({ source: "store", ref: "/profile", applyToRequest: false })
	async removeFriend(
		@RequestPerson() person: Person,
		@Param("id") friendPersonID: string,
		@Query() { block }: RemoveFriendDto
	) {
		return this.profileService.removeFriend(person, friendPersonID, block);
	}

	@ApiExcludeEndpoint()
	@Get(":personToken")
	findPersonByTokenBackwardCompatible(@Param("personToken") personToken: string) {
		return this.personsService.getByToken(personToken);
	}

	@ApiExcludeEndpoint()
	@Get(":personToken/profile")
	async findProfileByPersonTokenBackwardCompatible(@Param("personToken") personToken: string) {
		const person = await this.personsService.getByToken(personToken);
		return this.profileService.getByPersonOrCreate(person);
	}

	@ApiExcludeEndpoint()
	@Get("by-id/:personId")
	@Serialize(Person, { whitelist: ["id", "fullName", "group", "@context"] }, "SensitivePerson")
	async findPersonByPersonIdBackwardCompatible(@Param("personId") personId: string) {
		return this.personsService.get(personId);
	}

	@ApiExcludeEndpoint()
	@Get("by-id/:personId/profile")
	@Serialize(Profile, { whitelist: ["userID", "image", "profileDescription"] }, "SensitiveProfile")
	async getProfileByPersonIdBackwardCompatible(@Param("personId") personId: string) {
		return this.profileService.getByPersonOrCreate(await this.personsService.get(personId));
	}

	@ApiExcludeEndpoint()
	@Post(":personToken/profile")
	async createProfileBackwardCompatible(@Param("personToken") personToken: string, @Body() profile: Profile) {
		return this.profileService.create(await this.personsService.getByToken(personToken), profile);
	}

	@ApiExcludeEndpoint()
	@Put(":personToken/profile")
	async updateProfileBackwardCompatible(@Param("personToken") personToken: string, @Body() profile: Profile) {
		return this.profileService.update(await this.personsService.getByToken(personToken), profile);
	}

	/** Update profile */
	@Version("1")
	@Put("profile")
	@SwaggerRemote({ source: "store", ref: "/profile" })
	async updateProfile(@RequestPerson() person: Person, @Body() profile: Profile) {
		return this.profileService.update(person, profile);
	}

	@ApiExcludeEndpoint()
	@Post(":personToken/friends/:friendPersonID")
	async addFriendRequestBackwardCompatible(
		@Param("personToken") personToken: string, @Param("friendPersonID") friendPersonID: string
	) {
		return this.profileService.addFriendRequest(
			await this.personsService.getByToken(personToken),
			await this.personsService.get(friendPersonID)
		);
	}

	/** Request person to be your friend */
	@Version("1")
	@Post("friends/:id")
	@SwaggerRemote({ source: "store", ref: "/profile", applyToRequest: false })
	async addFriendRequest(@RequestPerson() person: Person, @Param("id") friendPersonID: string) {
		return this.profileService.addFriendRequest(person, await this.personsService.get(friendPersonID));
	}

	@ApiExcludeEndpoint()
	@Put(":personToken/friends/:friendPersonID")
	async acceptFriendRequestBackwardCompatible(
		@Param("personToken") personToken: string, @Param("friendPersonID") friendPersonID: string
	) {
		return this.profileService.acceptFriendRequest(
			await this.personsService.getByToken(personToken),
			await this.personsService.get(friendPersonID)
		);
	}

	@ApiExcludeEndpoint()
	@Delete(":personToken/friends/:friendPersonID")
	async removeFriendBackwardCompatible(
		@Param("personToken") personToken: string,
		@Param("friendPersonID") friendPersonID: string,
		@Query() { block }: RemoveFriendDto
	) {
		return this.profileService.removeFriend(
			await this.personsService.getByToken(personToken),
			friendPersonID,
			block
		);
	}

  /** Check if given email has an existing account */
  @Get("exists-by-email/:email")
	@HttpCode(204)
	async checkExistsByEmail(@Param("email") email: string) {
		await this.personsService.checkExistsByEmail(email);
	}
}
