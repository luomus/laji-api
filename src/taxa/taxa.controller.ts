import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";
import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { GetTaxaAggregateDto, GetTaxaChildrenDto, GetTaxaDescriptionsDto, GetTaxaPageDto, GetTaxaParentsDto,
	TaxaSearchDto, TaxonElastic, TaxonElasticDescription, TaxonElasticMedia, TaxonSearchResponse } from "./taxa.dto";
import { TaxaService } from "./taxa.service";
import { Translator } from "src/interceptors/translate.interceptor";
import { Serializer } from "src/serialization/serializer.interceptor";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";

@ApiTags("Taxon")
@LajiApiController("taxa")
export class TaxaController {

	constructor(private taxaService: TaxaService) {}

	/** Taxon name search */
	@Get("search")
	@UseInterceptors(Translator, Serializer(TaxonSearchResponse))
	@SwaggerRemoteRef({ source: "laji-backend", ref: "TaxonSearchResponse" })
	search(@Query() query: TaxaSearchDto) {
		return this.taxaService.search(query);
	}

	/** Get a page from the taxonomic backbone */
	@Get()
	@UseInterceptors(Translator, Serializer(TaxonElastic))
	@SwaggerRemoteRef({ source: "laji-backend", ref: "Taxon" })
	getPage(@Query() query: GetTaxaPageDto) {
		return this.taxaService.getPage(query);
	}

	/** Get an aggregate from the taxonomic backbone */
	@Get("aggregate")
	getAggregate(@Query() query: GetTaxaAggregateDto) {
		return this.taxaService.getAggregate(query);
	}

	/** Get a page of species */
	@Get("species")
	getSpeciesPage(@Query() query: GetTaxaPageDto) {
		return this.taxaService.getSpeciesPage(query);
	}

	/** Get a species aggregate from the taxonomic backbone */
	@Get("species/aggregate")
	getSpeciesAggregate(@Query() query: GetTaxaAggregateDto) {
		return this.taxaService.getSpeciesAggregate(query);
	}

	/** Get a page from the taxonomic backbone */
	@Get(":id")
	@UseInterceptors(Translator, Serializer(TaxonElastic))
	@SwaggerRemoteRef({ source: "laji-backend", ref: "Taxon" })
	get(@Param("id") id: string, @Query() query: GetTaxaPageDto) {
		return this.taxaService.getBySubject(id, query);
	}

	/** Get children of a taxon */
	@Get(":id/children")
	@UseInterceptors(Translator, Serializer(TaxonElastic))
	@SwaggerRemoteRef({ source: "laji-backend", ref: "Taxon" })
	getTaxonChildren(@Param("id") id: string, @Query() query: GetTaxaChildrenDto) {
		return this.taxaService.getChildren(id, query);
	}

	/** Get parents of a taxon */
	@Get(":id/parents")
	@UseInterceptors(Translator, Serializer(TaxonElastic))
	@SwaggerRemoteRef({ source: "laji-backend", ref: "Taxon" })
	getTaxonParents(@Param("id") id: string, @Query() query: GetTaxaParentsDto) {
		return this.taxaService.getTaxonParents(id, query);
	}

	/** Get species and subspecies of the taxon */
	@Get(":id/species")
	@UseInterceptors(Translator, Serializer(TaxonElastic))
	@SwaggerRemoteRef({ source: "laji-backend", ref: "Taxon" })
	getTaxonSpeciesPage(@Param("id") id: string, @Query() query: GetTaxaPageDto) {
		return this.taxaService.getTaxonSpeciesPage(id, query);
	}

	/** Get species and subspecies of the taxon */
	@Get(":id/species/aggregate")
	getTaxonSpeciesAggregate(@Param("id") id: string, @Query() query: GetTaxaAggregateDto) {
		return this.taxaService.getTaxonSpeciesAggregate(id, query);
	}

	/** Get description texts of a taxon */
	@Get(":id/descriptions")
	@SwaggerRemoteRef({ source: "laji-backend", ref: "Content" })
	@UseInterceptors(Translator, Serializer(TaxonElasticDescription))
	getTaxonDescriptions(@Param("id") id: string, @Query() query: GetTaxaDescriptionsDto) {
		return this.taxaService.getTaxonDescriptions(id, query);
	}

	/** Get media objects of a taxon */
	@Get(":id/media")
	@SwaggerRemoteRef({ source: "laji-backend", ref: "Image" })
	@UseInterceptors(Translator, Serializer(TaxonElasticMedia))
	getTaxonMedia(@Param("id") id: string, @Query() query: GetTaxaDescriptionsDto) {
		return this.taxaService.getTaxonMedia(id, query);
	}
}
