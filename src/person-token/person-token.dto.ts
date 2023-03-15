export interface LajiAuthPersonGet {
	user: {
		qname: string;
	}
	next: string;
	target: string;
}

export interface PersonTokenInfo {
	personId: string;
	next: string;
	target: string;
}
