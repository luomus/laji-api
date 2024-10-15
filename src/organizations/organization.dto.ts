import { Organization as _Organization } from "@luomus/laji-schema";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import { MultiLang } from "src/common.dto";

export type Organization = _Organization & {
	"@context": string;
}

export class OrganizationDto implements Organization {
	"@context": string;
	organizationLevel1: MultiLang;
	organizationLevel2?: MultiLang;
	organizationLevel3?: MultiLang;
	organizationLevel4?: MultiLang;
	abbreviation?: string;

	@ApiProperty() @Expose() get fullName(): string {
		const nameKeys = [
			"organizationLevel1",
			"organizationLevel2",
			"organizationLevel3",
			"organizationLevel4"
		] as const;
		return nameKeys.map(key => this[key]).filter(name => !!name).join(", ");
	}
}
