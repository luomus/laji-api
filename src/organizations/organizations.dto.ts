import { IntersectionType } from "@nestjs/swagger";
import { HasSelectedFields, QueryWithPagingDto } from "src/common.dto";

export class GetAllOrganizationsDto extends IntersectionType(HasSelectedFields, QueryWithPagingDto) {}
