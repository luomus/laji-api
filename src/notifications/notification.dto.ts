import { PagedDto } from "src/common.dto";

export class GetPageDto extends PagedDto {
	/**
	 * Return only notifications that have not been marked as seen.
	 */
	onlyUnSeen?: boolean;
}
