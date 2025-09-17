import { IntersectionType } from "@nestjs/swagger";
import { HasSelectedFields, QueryWithPagingDto } from "src/common.dto";
import { Organization as _Organization } from "@luomus/laji-schema";
import { MultiLangDto } from "src/common.dto";

export class GetAllOrganizationsDto extends IntersectionType(HasSelectedFields, QueryWithPagingDto) {}

export type Organization = _Organization & {
	"@context": string;
}

export class OrganizationDto implements Organization {
	"@context": string;
	organizationLevel1: MultiLangDto;
	organizationLevel2?: MultiLangDto;
	organizationLevel3?: MultiLangDto;
	organizationLevel4?: MultiLangDto;
	abbreviation?: string;
}
