import { IntersectionType } from "@nestjs/swagger";
import { QueryWithPagingDto, QueryWithLangDto } from "../common.dto";
import { CommaSeparatedStrings } from "src/serialization/serialization.utils";
import { ChecklistVersion as _ChecklistVersion } from "@luomus/laji-schema";

export class GetChecklistVersionsPageDto extends IntersectionType(QueryWithLangDto, QueryWithPagingDto) {
	/**	Include only items with the given ids. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() idIn?: string[];
}

export class GetChecklistVersionsDto extends IntersectionType(QueryWithLangDto) {}

export type ChecklistVersion = _ChecklistVersion & { id: string };
