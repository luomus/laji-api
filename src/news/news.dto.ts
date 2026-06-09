import { IntersectionType, OmitType } from "@nestjs/swagger";
import { QueryWithPagingDto } from "src/common.dto";
import { LajiBackendCMSNode } from "src/information/information.dto";
import { PaginatedDto } from "src/pagination.dto";

export class GetNewsPageDto extends IntersectionType(QueryWithPagingDto) {
	/** Show only news with the given tag(s). Multiple values are separated by a comma (,). */
	tag?: string;
}

export class NewsPagedDto extends IntersectionType(OmitType(PaginatedDto, ["results"])) {
	results: LajiBackendNewsNode[];
}

class LajiBackendNewsNode extends OmitType(LajiBackendCMSNode, ["tags"]) {
	external: boolean;
	externalURL?: string;
	tag?: string;
}
