import { FormPermission, FormPermissionPerson, FormPermissionSingle } from "@luomus/laji-schema/classes";
import { ApiProperty, OmitType } from "@nestjs/swagger";

export enum FormPermissionEntityType {
	empty = "",
	admin = "MFP.typeAdmin",
	editor = "MFP.typeEditor",
	request = "MFP.typeAccessRequest"
}

export enum RestrictAccess {
	strict = "MHL.restrictAccessStrict",
	loose = "MHL.restrictAccessLoose"
}

export class FormPermissionEntity extends OmitType(FormPermissionSingle, ["type"]) {
	id: string;
	type?: FormPermissionEntityType;
}

export class FormPermissionDto extends FormPermission {
	admins: string[];
	editors: string[];
	permissionRequests: string[];
	collectionID: string;
	@ApiProperty({ enum: [RestrictAccess.strict, RestrictAccess.loose] }) restrictAccess?: RestrictAccess;
	hasAdmins?: boolean;
}

export class FormPermissionPersonDto extends FormPermissionPerson {
	admins: string[];
	editors: string[];
	permissionRequests: string[];
}
