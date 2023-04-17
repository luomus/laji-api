import { PagedDto } from "src/common.dto";

export class Notification {
	id: string;
	seen: boolean;
	created: string;
	toPerson: string;
	friendRequest?: string;
	friendRequestAccepted?: string;
}

export class GetPageDto extends PagedDto {
	/**
	 * Return only notifications that have not been marked as seen.
	 */
	onlyUnSeen?: boolean;
}
