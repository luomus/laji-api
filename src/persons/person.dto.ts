import { Exclude } from "class-transformer";

export enum Role {
	Admin = "MA.admin"
}

export class Person {
	id: string;
	fullName: string;
	emailAddress: string;
	@Exclude()
	inheritedName?: string;
	@Exclude()
	preferredName?: string;
	@Exclude()
	address?: string;
	@Exclude()
	lintuvaaraLoginName?: string
	role?: Role[];
}
