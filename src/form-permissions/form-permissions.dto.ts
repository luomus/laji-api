enum AcceptAccess {
	admin = "admin",
	editor = "editor"
}

export class AcceptAccessDto {
	/** Access type */
	type?: AcceptAccess = AcceptAccess.editor;
}

