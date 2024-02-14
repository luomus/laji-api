import { HasContext } from "src/common.dto";
import { Private } from "src/serializing/private.decorator";
import { IsOptionalBoolean } from  "src/serializing/serializing";

export enum Role {
	Admin = "MA.admin",
	Import = "_IMPORT_"
}

export class Person extends HasContext {
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
