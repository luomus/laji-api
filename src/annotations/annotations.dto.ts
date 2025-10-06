import { IntersectionType } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { QueryWithPagingDto } from "src/common.dto";

export class GetAnnotationsDto extends IntersectionType(QueryWithPagingDto) {
	/** Filter by root ID */
	@IsString() rootID: string;
}
