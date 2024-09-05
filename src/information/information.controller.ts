import { Get, Param, Query } from "@nestjs/common";
import { InformationService } from "./information.service";
import { GetAllInformationDto } from "./information.dto";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Information")
@LajiApiController("information")
export class InformationController {

	constructor(private informationService: InformationService) {}

	/** Returns id of the index page of some language */
	@Get("index")
	getIndex(@Query() { lang }: GetAllInformationDto) {
		// '!' is valid here, because DTO classes must have '?' modifier for properties with defaults, making the
		// typings bit awkward.
		return this.informationService.getIndex(lang!);
	}

	/** Get information page by id */
	@Get(":id")
	get(@Param("id") id: string) {
		return this.informationService.get(id);
	}

	/** Get information page contents */
	@Get()
	getAll(@Query() { lang }: GetAllInformationDto) {
		// '!' is valid here, because DTO classes must have '?' modifier for properties with defaults, making the
		// typings bit awkward.
		return this.informationService.getAll(lang!);
	}

}
