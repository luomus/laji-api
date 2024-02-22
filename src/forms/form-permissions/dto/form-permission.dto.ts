import { FormPermission, FormPermissionPerson, FormPermissionSingle } from "@luomus/laji-schema/classes";
import { OmitType } from "@nestjs/swagger";

export enum FormPermissionEntityType {
	empty = "",
	admin = "MFP.typeAdmin",
	editor = "MFP.typeEditor",
	request = "MFP.typeAccessRequest"
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
}

export class FormPermissionPersonDto extends FormPermissionPerson {
	admins: string[];
	editors: string[];
	permissionRequests: string[];
}
