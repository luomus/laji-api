export interface LajiAuthPersonGet {
	user: {
		qname: string;
	}
	next: string;
	target: string;
}

export interface PersonTokenInfo {
	personId: string | null;
	next: string;
	target: string;
}
