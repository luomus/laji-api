import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { GetTaxaAggregateDto, GetTaxaChildrenDto, GetTaxaDescriptionsDto, GetTaxaPageDto, GetTaxaParentsDto, TaxonElastic, TaxonElasticDescription, TaxonElasticMedia } from "./taxa.dto";
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
	getAggregate(@Query() query: GetTaxaAggregateDto) {
		return this.taxaService.getAggregate(query);
	}

	/** Get a page from the taxonomic backbone */
	@Get(":id")
	@UseInterceptors(Translator, createNewSerializingInterceptorWith(TaxonElastic))
	@ApiOkResponse({ type: TaxonElastic })
	get(@Param("id") id: string, @Query() query: GetTaxaPageDto) {
		return this.taxaService.getBySubject(id, query);
	}

	/** Get children of a taxon */
	@Get(":id/children")
	@UseInterceptors(Translator, createNewSerializingInterceptorWith(TaxonElastic))
	@ApiOkResponse({ type: TaxonElastic })
	getChildren(@Param("id") id: string, @Query() query: GetTaxaChildrenDto) {
		return this.taxaService.getChildren(id, query);
	}


	/** Get parents of a taxon */
	@Get(":id/parents")
	@UseInterceptors(Translator, createNewSerializingInterceptorWith(TaxonElastic))
	@ApiOkResponse({ type: TaxonElastic })
	getParents(@Param("id") id: string, @Query() query: GetTaxaParentsDto) {
		return this.taxaService.getParents(id, query);
	}

	/** Get description texts of a taxon */
	@Get(":id/descriptions")
	@UseInterceptors(Translator, createNewSerializingInterceptorWith(TaxonElasticDescription))
	getDescriptions(@Param("id") id: string, @Query() query: GetTaxaDescriptionsDto) {
		return this.taxaService.getDescriptions(id, query);
	}

	/** Get media objects texts of a taxon */
	@Get(":id/media")
	@UseInterceptors(Translator, createNewSerializingInterceptorWith(TaxonElasticMedia))
	getMedia(@Param("id") id: string, @Query() query: GetTaxaDescriptionsDto) {
		return this.taxaService.getMedia(id, query);
	}
}
