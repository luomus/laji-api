import { IsBoolean } from "class-validator";
import { Exclude, ParseOptionalBoolean } from "src/type-utils";

export enum Role {
	Admin = "MA.admin"
}

export class HasContext {
	"@context": string;
}

export class Person extends HasContext {
	id: string;
	emailAddress: string;
	@Exclude() inheritedName?: string;
	@Exclude() preferredName?: string;
	@Exclude() lajiAuthLoginName?: string;
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
