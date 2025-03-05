import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Get, Param, Query, UseInterceptors, ValidationPipe } from "@nestjs/common";
import { GetTaxaAggregateDto, GetTaxaPageDto, TaxonElastic } from "./taxa.dto";
import { TaxaService } from "./taxa.service";
import { Translator } from "src/interceptors/translate.interceptor";
import { createNewSerializingInterceptorWith } from "src/serialization/serializing.interceptor";

@ApiTags("Taxon")
@LajiApiController("taxa")
export class TaxaController {

	constructor(private taxaService: TaxaService) {}

	/** Get a page from the taxonomic backbone */
	@Get()
	@UseInterceptors(Translator, createNewSerializingInterceptorWith(TaxonElastic))
	@ApiOkResponse({ type: TaxonElastic })
	getPage(@Query() query: GetTaxaPageDto) {
		return this.taxaService.getPage(query);
	}

	/** Get an aggregate from the taxonomic backbone */
	@Get("aggregate")
	getAggregate(@Query(new ValidationPipe({ whitelist: true })) query: GetTaxaAggregateDto) {
		return this.taxaService.getAggregate(query);
	}

	/** Get a page from the taxonomic backbone */
	@Get(":id")
	@UseInterceptors(Translator, createNewSerializingInterceptorWith(TaxonElastic))
	@ApiOkResponse({ type: TaxonElastic })
	get(@Query(new ValidationPipe({ whitelist: true })) query: GetTaxaPageDto, @Param("id") id: string) {
		return this.taxaService.getBySubject(id, query);
	}
}
