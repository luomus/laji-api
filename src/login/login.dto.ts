import { IsOptionalBoolean } from "src/serialization/serialization.utils";

export class GetTmpTokenQueryDto {
	@IsOptionalBoolean() offerPermanent: boolean = true;
}

export class CheckTmpTokenQueryDto {
	tmpToken: string;
}
