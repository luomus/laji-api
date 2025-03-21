import { IntersectionType } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { QueryWithPagingDto, QueryWithPersonTokenDto } from "src/common.dto";

export class GetAnnotationsDto extends IntersectionType(
	QueryWithPersonTokenDto,
	QueryWithPagingDto
) {
	/** Filter by root ID */
	@IsString() rootID: string;
}


export class CreateAnnotationDto extends QueryWithPersonTokenDto {};
