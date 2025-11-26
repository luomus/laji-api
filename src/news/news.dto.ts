import { IntersectionType } from "@nestjs/swagger";
import { QueryWithPagingDto } from "src/common.dto";

export class GetNewsPageDto extends IntersectionType(QueryWithPagingDto) {
	/** Show only news with the given tag(s). Multiple values are separated by a comma (,). */
	tag?: string;
}
