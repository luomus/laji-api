import {PickType} from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";

export enum Role {
	Admin = "MA.admin"
}

export class HasContext {
	@Expose()
	"@context": string;
}

export class Person extends HasContext {
	@Expose() 
	id: string;

	@Expose() 
	emailAddress: string;

	@Expose() 
	inheritedName?: string;

	@Expose() 
	preferredName?: string;

	@Expose() 
	role?: Role[];

	@Expose() 
	group?: string;

	@Expose() 
	organisation?: string[];

	@Expose() 
	organisationAdmin?: string[];

	@Expose()
	securePortalUserRoleExpires?: string;

	@Exclude()
	private _fullName?: string;

	set fullName(fullName: string) {
		this._fullName = fullName;
	}
	@Expose() 
	get fullName(): string {
		return this._fullName ||( (this.inheritedName || "") + (this.preferredName || ""));
	}
}
export class PublicPerson extends PickType(Person, ["id", "fullName", "group", "@context"]) {
}
