import { IntersectionType } from "@nestjs/swagger";
import { PagedDto, LangQueryDto } from "../common.dto";
import { CommaSeparatedStrings } from "src/serializing/serializing";
import { ChecklistVersion as _ChecklistVersion } from "@luomus/laji-schema";

export class GetChecklistVersionsPageDto extends IntersectionType(LangQueryDto, PagedDto) {
	/**	Include only items with the given ids. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() idIn?: string[];
}

export class GetChecklistVersionsDto extends IntersectionType(LangQueryDto) {}

export type ChecklistVersion = _ChecklistVersion & { id: string };
