import { FormPermissionSingle, FormPermission, FormPermissionPerson } from "laji-schema";

export enum FormPermissionEntityType {
	empty = "",
	admin = "MFP.typeAdmin",
	editor = "MFP.typeEditor",
	request = "MFP.typeAccessRequest"
}

export class FormPermissionEntity implements FormPermissionSingle {
	"@context"?: string;
	id: string;
	"@type"?: string;
	collectionID: string;
	type?: FormPermissionEntityType;
	userID?: string;
}

export class FormPermissionDto implements FormPermission {
	"@context"?: string;
	id?: string;
	"@type"?: string;
	/**
	 * List of person IDs with admin permissions
	 */
	admins: string[];
	/**
	 * List of person IDs with edit permissions
	 */
	editors: string[];
	/**
	 * List of person IDs requesting permission to form
	 */
	permissionRequests: string[];
	collectionID: string;
}

export class FormPermissionPersonDto implements FormPermissionPerson {
	personID: string;
	/**
	 * List of collection IDs that the person has admin permission to
	 */
	admins: string[];
	/**
	 * List of collection IDs that the person has edit permission to
	 */
	editors: string[];
	/**
	 * List of collection IDs that the person has requested permission for
	 */
	permissionRequests: string[];
}
