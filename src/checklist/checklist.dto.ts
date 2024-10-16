import { IntersectionType } from "@nestjs/swagger";
import { PagedDto, LangQueryDto } from "../common.dto";
import { CommaSeparatedStrings } from "src/serialization/serialization.utils";
import { Checklist as _Checklist } from "@luomus/laji-schema";

export class GetChecklistPageDto extends IntersectionType(LangQueryDto, PagedDto) {
	/**	Include only items with the given ids. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() idIn?: string[];
}

export class GetChecklistDto extends IntersectionType(LangQueryDto) {}

export type Checklist = _Checklist & { id: string };
