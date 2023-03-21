import { ClassSerializerInterceptor, Controller, Delete, Get, Param, Post, Put, UseInterceptors } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import {map, Observable, tap} from "rxjs";
import {ProfileService} from "src/profile/profile.service";
import {serializeInto} from "src/type-utils";
import { Person, PublicPerson } from "./person.dto";
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
		return this.profileService.findProfileByPersonToken(personToken);
	}

	@Get("by-id/:personId") 
	findPersonByPersonId(@Param("personId") personId: string) {
		// return this.personsService.findByPersonId(personId).pipe(map(makePublic));
		return this.personsService.findByPersonId(personId).pipe(
			map(serializeInto(PublicPerson, {excludeExtraneousValues: true})),
		);
	}

	@Get("by-id/:personId/profile") 
	getProfileByPersonId(@Param("personId") personId: string) {
		return this.profileService.findProfileByPersonId(personId);
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
