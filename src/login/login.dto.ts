import { IntersectionType } from "@nestjs/swagger";
import { IsOptionalBoolean } from "src/serialization/serialization.utils";

export class GetTmpTokenQueryDto {
	@IsOptionalBoolean() offerPermanent: boolean = true;
}

export class CheckTmpTokenQueryDto {
	tmpToken: string;
}

export class CheckTmpTokenDto {
	tmpToken: string;
}

export class GetTmpTokenDto extends IntersectionType(CheckTmpTokenDto) {
	loginURL?: string;
}
