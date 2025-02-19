import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Get, Query, UseInterceptors } from "@nestjs/common";
import { GetTaxaAggregateDto, GetTaxaPageDto, TaxonElastic } from "./taxa.dto";
import { TaxaService } from "./taxa.service";
import { Translator } from "src/interceptors/translate.interceptor";
import { createNewSerializingInterceptorWith } from "src/serialization/serializing.interceptor";

@ApiTags("Taxon")
@LajiApiController("taxa")
export class TaxaController {

	constructor(private taxaService: TaxaService) {}

	/** Get a page of taxa from the taxonomic backbone */
	@Get()
	@UseInterceptors(Translator, createNewSerializingInterceptorWith(TaxonElastic))
	@ApiOkResponse({ type: TaxonElastic })
	getPage(@Query() query: GetTaxaPageDto) {
		return this.taxaService.getPage(query);
	}


	/** Get taxa aggregate from the taxonomic backbone */
	@Get("aggregate")
	getAggregate(@Query() query: GetTaxaAggregateDto) {
		return this.taxaService.getAggregate(query);
	}
}
