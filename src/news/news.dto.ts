import { IntersectionType } from "@nestjs/swagger";
import { QueryWithPagingDto } from "src/common.dto";
import { CommaSeparatedStrings } from "src/serialization/serialization.utils";

export class GetNewsPageDto extends IntersectionType(QueryWithPagingDto) {
	// @CommaSeparatedStrings() tag?: string[];
	/** Show only news with the given tag(s). Multiple values are separated by a comma (,). */
	tag?: string;
}
