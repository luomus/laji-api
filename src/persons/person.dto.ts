import { HasContext } from "src/common.dto";
import { IsOptionalBoolean } from  "src/serializing/serializing";
import { Person as _Person } from "@luomus/laji-schema/models";
import { Exclude } from "class-transformer";

export enum Role {
	Admin = "MA.admin",
	Import = "_IMPORT_"
}

enum RoleAnnotation {
	expert = "MMAN.expert"
};

export class Person extends HasContext implements Omit<_Person, "role" | "fullName"> {
	id: string;
	emailAddress: string;
	@Exclude() inheritedName?: string;
	@Exclude() preferredName?: string;
	@Exclude() lajiAuthLoginName?: string;
	fullName?: string;
	role: Role[] = [];
	group?: string;
	organisation?: string[];
	organisationAdmin?: string[];
	securePortalUserRoleExpires?: string;
	roleAnnotation: RoleAnnotation;

	isImporter() {
		return this.role.includes(Role.Import);
	}
}

export const decoratePerson = (person: Person): Person => {
	if (person.fullName === undefined) {
		person.fullName = `${(person.inheritedName || "")} ${(person.preferredName || "")}`;
	}
	return person;
};

export class RemoveFriendDto {
	// eslint-disable-next-line @typescript-eslint/no-inferrable-types
	@IsOptionalBoolean()
	block: boolean = false;
}
