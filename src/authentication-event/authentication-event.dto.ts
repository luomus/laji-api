export interface LajiAuthPersonGet {
	user: {
		qname: string;
	}
	next: string;
	target: string;
}

export class PersonTokenInfo {
	personId: string;
	next: string;
	target: string;
}
