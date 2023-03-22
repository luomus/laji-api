import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { map, switchMap } from "rxjs";
import { Profile, PublicProfile } from "src/profile/profile.dto";
import { ProfileService } from "src/profile/profile.service";
import { serializeInto } from "src/type-utils";
import { PublicPerson } from "./person.dto";
import { PersonsService } from "./persons.service";

@ApiSecurity("access_token")
@ApiTags("person")
@Controller("persons")
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
	getProfileByPersonToken(@Param("personToken") personToken: string) {
		return this.profileService.getByPersonToken(personToken);
	}

	/*
	 * Find person by user id (this will not include email);
	 */
	@Get("by-id/:personId") 
	findPersonByPersonId(@Param("personId") personId: string) {
		return this.personsService.findByPersonId(personId).pipe(
			map(serializeInto(PublicPerson, { excludeExtraneousValues: true })),
		);
	}

	/*
	 * Find profile by user id (this will only return small subset of the full profile);
	 */
	@Get("by-id/:personId/profile") 
	getProfileByPersonId(@Param("personId") personId: string) {
		return this.profileService.getByPersonId(personId).pipe(
			map(serializeInto(PublicProfile, { excludeExtraneousValues: true })),
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
