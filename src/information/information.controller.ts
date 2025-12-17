import { Get, Param } from "@nestjs/common";
import { InformationService } from "./information.service";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";
import { RequestLang } from "src/decorators/request-lang.decorator";
import { Lang } from "src/common.dto";

@ApiTags("Informations")
@LajiApiController("information")
export class InformationController {

	constructor(private informationService: InformationService) {}

	/** Returns id of the index page. Allowed languages are 'fi', 'sv', 'en'.  */
	@Get("index")
	getIndex(@RequestLang({ allowMulti: false }) lang: Omit<Lang, "multi">) {
		return this.informationService.getIndex(lang);
	}

	/** Get information page by id */
	@Get(":id")
	get(@Param("id") id: string) {
		return this.informationService.get(id);
	}

	/** Get information page contents. Allowed languages are 'fi', 'sv', 'en'. */
	@Get()
	getAll(@RequestLang({ allowMulti: false }) lang: Omit<Lang, "multi">) {
		return this.informationService.getAll(lang);
	}

}
