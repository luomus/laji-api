import { IsBoolean } from "class-validator";
import { HasContext } from "src/common.dto";
import { Private } from "src/serializing/private.decorator";
import { ParseOptionalBoolean } from  "src/serializing/serializing";

export enum Role {
	Admin = "MA.admin"
}

export class Person extends HasContext {
	id: string;
	emailAddress: string;
	@Private() inheritedName?: string;
	@Private() preferredName?: string;
	@Private() lajiAuthLoginName?: string;
	fullName?: string;
	role?: Role[];
	group?: string;
	organisation?: string[];
	organisationAdmin?: string[];
	securePortalUserRoleExpires?: string;
}

export const decoratePerson = (person: Person): Person => {
	if (person.fullName === undefined) {
		person.fullName = `${(person.inheritedName || "")} ${(person.preferredName || "")}`;
	}
	return person;
}

export class RemoveFriendDto {
	// eslint-disable-next-line @typescript-eslint/no-inferrable-types
	@ParseOptionalBoolean()
	@IsBoolean()
	block: boolean = false;
}
