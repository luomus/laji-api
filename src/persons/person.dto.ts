import { HasContext } from "src/common.dto";
import { Private } from "src/serializing/private.decorator";
import { IsOptionalBoolean } from  "src/serializing/serializing";
import { Person as _Person } from "@luomus/laji-schema/models";

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
	@Private() inheritedName?: string;
	@Private() preferredName?: string;
	@Private() lajiAuthLoginName?: string;
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
