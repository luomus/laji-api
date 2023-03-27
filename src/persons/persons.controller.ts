import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { map, switchMap, tap } from "rxjs";
import { Profile } from "src/profile/profile.dto";
import { ProfileService } from "src/profile/profile.service";
import { serializeInto } from "src/type-utils";
import { Person } from "./person.dto";
import { PersonsService } from "./persons.service";

@ApiSecurity("access_token")
@ApiTags("person")
@Controller("person")
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
		return this.personsService.findByToken(personToken);
	}

	@Get(":personToken/profile")
	findProfileByPersonToken(@Param("personToken") personToken: string) {
		return this.profileService.findByPersonToken(personToken);
	}

	/*
	 * Find person by user id (this will not include email);
	 */
	@Get("by-id/:personId")
	findPersonByPersonId(@Param("personId") personId: string) {
		return this.personsService.findByPersonId(personId).pipe(
			map(serializeInto(Person, {whitelist: ["id", "fullName", "group", "@context"]}))
		);
	}

	/*
	 * Find profile by user id (this will only return small subset of the full profile);
	 */
	@Get("by-id/:personId/profile")
	getProfileByPersonId(@Param("personId") personId: string) {
		return this.profileService.getByPersonId(personId).pipe(
			map(serializeInto(Profile, {whitelist: ["userID", "profileKey", "image", "profileDescription"]}))
		);
	}

	/*
	 * Create profile
	 */
	@Post(":personToken/profile")
	createProfile(@Param("personToken") personToken: string, @Body() profile: Profile) {
		return this.personsService.findByToken(personToken).pipe(switchMap(({ id }) =>
			this.profileService.createWithPersonId(id, profile)
		));
	}

	/*
	 * Update profile
	 */
	@Put(":personToken/profile")
	updateProfile(@Param("personToken") personToken: string, @Body() profile: Profile) {
		console.log('up', profile);
		return this.personsService.findByToken(personToken).pipe(switchMap(({ id }) =>
			this.profileService.updateWithPersonId(id, profile)
		));
	}

	// @Post(":personToken/friends/:profileKey") 
	// addFriendRequest(@Param("personToken") personToken: string, @Param("userId") userId: string) {
	// 	return this.personsService.addFriendRequest(personToken, userId);
	// }
	//
	// @Put(":personToken/friends/:profileKey") 
	// acceptFriendRequest(@Param("personToken") personToken: string, @Param("userId") userId: string) {
	// 	return this.personsService.acceptFriendRequest(personToken, userId);
	// }
	//
	// @Delete(":personToken/friends/:profileKey") 
	// removeFriend(@Param("personToken") personToken: string, @Param("userId") userId: string) {
	// 	return this.personsService.removeFriend(personToken, userId);
	// }
}

// const makePublic = (person: Person) => new PublicPerson(person);
