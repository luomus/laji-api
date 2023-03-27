export enum Role {
	Admin = "MA.admin"
}

export class HasContext {
	"@context": string;
}

export class Person extends HasContext {
	id: string;
	emailAddress: string;
	inheritedName?: string;
	preferredName?: string;
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
