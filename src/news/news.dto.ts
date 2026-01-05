import { IntersectionType, OmitType } from "@nestjs/swagger";
import { QueryWithPagingDto } from "src/common.dto";
import { PaginatedDto } from "src/pagination.dto";

export class GetNewsPageDto extends IntersectionType(QueryWithPagingDto) {
	/** Show only news with the given tag(s). Multiple values are separated by a comma (,). */
	tag?: string;
}

export class NewsDto {
	id: string;
	featuredImage: string;
	external: boolean;
	externalURL?: boolean;
	title: boolean;
	content: boolean;
	posted: boolean;
	modified?: boolean;
	tag: boolean;
}

export class NewsPagedDto extends IntersectionType(OmitType(PaginatedDto, ["results"])) {
	results: NewsDto[];
}
