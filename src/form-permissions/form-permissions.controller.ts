import { Get, Post, Param, Delete, Put, Query } from "@nestjs/common";
import { AcceptAccessDto } from "./form-permissions.dto";
import { ApiTags } from "@nestjs/swagger";
import { FormPermissionsService } from "./form-permissions.service";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { Person } from "src/persons/person.dto";
import { RequestPerson } from "src/decorators/request-person.decorator";

@ApiTags("Form Permissions")
@LajiApiController("form-permissions")
export class FormPermissionsController {

	constructor(
		private readonly formPermissionsService: FormPermissionsService,
	) {}

	/** Get form permissions for a person */
	@Get()
	getPermissions(@RequestPerson() person: Person) {
		return this.formPermissionsService.getByPerson(person);
	}

	/** Get form permissions for a person, and the form information about whether it has MHL.restrictAccess or MHL.hasAdmins */
	@Get(":collectionID")
	getPermissionsByCollectionID(
		@Param("collectionID") collectionID: string,
		@RequestPerson({ required: false }) person?: Person
	) {
		return this.formPermissionsService.getByCollectionIDAndPerson(collectionID, person);
	}

	/** Request access to form */
	@Post(":collectionID")
	requestAccess(
		@Param("collectionID") collectionID: string,
		@RequestPerson() person: Person
	) {
		return this.formPermissionsService.requestAccess(collectionID, person);
	}

	/** Accept access to form */
	@Put(":collectionID/:personID")
	acceptAccess(
		@Param("collectionID") collectionID: string,
		@Param("personID") personID: string,
		@Query() { type }: AcceptAccessDto,
		@RequestPerson({ description: "Person's authentication token who is authorizing the acception" }) person: Person
	) {
		return this.formPermissionsService.acceptAccess(collectionID, personID, type!, person);
	}

	/** Remove access to form */
	@Delete(":collectionID/:personID")
	revokeAccess(
		@Param("collectionID") collectionID: string,
		@Param("personID") personID: string,
		@RequestPerson({ description: "Person's authentication token who is authorizing the removal" }) person: Person
	) {
		return this.formPermissionsService.revokeAccess(collectionID, personID, person);
	}
}
