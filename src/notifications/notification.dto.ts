import { QueryWithPagingDto } from "src/common.dto";

export class QueryWithPagingAndLangDto extends QueryWithPagingDto {
	/**
	 * Return only notifications that have not been marked as seen.
	 */
	onlyUnSeen?: boolean;
}
