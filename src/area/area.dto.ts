import { Area as AreaI } from "@luomus/laji-schema";
import { HasContext, LangQueryDto, PagedDto } from "../common.dto";
import { IntersectionType } from "@nestjs/swagger";
import { CommaSeparatedStrings } from "src/serializing/serializing";

export type Area = AreaI & HasContext & { id: string };

export class GetAreaPageDto extends IntersectionType(
	PagedDto,
	LangQueryDto
) {
	/**	Include only items with the given ids. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() idIn?: string[];
}
