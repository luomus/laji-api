import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";
import { OrganizationsService } from "./organizations.service";
import { Get, Param } from "@nestjs/common";
import { Serialize } from "src/serializing/serialize.decorator";
import { OrganizationDto } from "./organization.dto";
import { LangService } from "src/lang/lang.service";
import { serializeInto } from "src/serializing/serializing";

@ApiTags("Organization")
@LajiApiController("organizations")
export class OrganizationsController {
	constructor(
		private organizationsService: OrganizationsService,
		private langService: LangService
	) {}

	/** Find an organization by id */
	@Get(":id")
	// @Serialize(OrganizationDto)
	@Serialize(OrganizationDto, { whitelist: [
		"id",
		"@context",
		"organizationLevel1",
		"organizationLevel2",
		"organizationLevel3",
		"organizationLevel4",
		"abbreviation",
		"fullName",
	], }, "SensitiveOrganization")
	async get(@Param("id") id: string) {
		return this.langService.translate(await this.organizationsService.get(id));
	}
}
