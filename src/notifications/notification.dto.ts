import { IntersectionType } from "@nestjs/swagger";
import { HasSelectedFields, QueryWithPagingDto } from "src/common.dto";

export class GetNotificationsDto extends IntersectionType(QueryWithPagingDto, HasSelectedFields) {
	/** Return only notifications that have not been marked as seen.  */
	onlyUnSeen?: boolean;
}
