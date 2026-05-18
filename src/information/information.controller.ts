import { Get, Param } from "@nestjs/common";
import { InformationService } from "./information.service";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Information")
@LajiApiController("information")
export class InformationController {

	constructor(private informationService: InformationService) {}

	/** Get information page by id */
	@Get(":id")
	get(@Param("id") id: string) {
		return this.informationService.get(id);
	}
}
