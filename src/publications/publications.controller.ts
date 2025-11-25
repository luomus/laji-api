import { Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { PublicationsService } from "./publications.service";

@ApiTags("Publications")
@LajiApiController("publications")
export class PublicationsController {
	constructor(private publicationsService: PublicationsService) {}

	@Get(":id")
	get(@Param("id") id: string) {
		return this.publicationsService.get(id);
	}
}
