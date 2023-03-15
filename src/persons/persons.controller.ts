import { Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Person } from "./person.dto";
import { PersonsService } from "./persons.service";

@ApiSecurity("access_token")
@ApiTags("person")
@Controller("persons")
export class PersonsController {
	constructor(private readonly personsService: PersonsService) {}

	/*
	 * Find person by person token
	 */
	@Get(":personToken") 
	findByToken(@Param("personToken") personToken: string) {
		return this.personsService.findByToken(personToken);
	}


	// @Get(":personToken/profile") 
	// getProfile(@Param("personToken") personToken: string) {
	// 	return this.personsService.findOne(personToken);
	// }

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
