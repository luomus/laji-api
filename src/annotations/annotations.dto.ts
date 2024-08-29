import { IntersectionType, PartialType } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { PagedDto, QueryWithPersonTokenDto } from "src/common.dto";

export class GetAnnotationsDto extends IntersectionType(
	QueryWithPersonTokenDto,
	PagedDto
) {
	/** Filter by root ID */
	@IsString() rootID: string;
}


export class CreateAnnotationDto extends PartialType(QueryWithPersonTokenDto) {};
