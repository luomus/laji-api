import { Exclude } from "class-transformer";

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
}
