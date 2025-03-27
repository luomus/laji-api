import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { Body, Get, Param, Post, Query, UseInterceptors, Version } from "@nestjs/common";
import { GetTaxaAggregateDto, GetTaxaDescriptionsDto, GetTaxaPageDto, GetTaxaResultsDto, GetTaxonDto, TaxaSearchDto,
	TaxonElastic } from "./taxa.dto";
import { TaxaService, getFiltersSchema } from "./taxa.service";
import { Translator } from "src/interceptors/translator.interceptor";
import { Serializer } from "src/serialization/serializer.interceptor";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { ResultsArray } from "src/interceptors/results-array.interceptor";
import { SchemaItem } from "src/swagger/swagger.service";
import { OpenAPIObject, ReferenceObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { parseURIFragmentIdentifierRepresentation } from "src/utils";
import { TaxaFilters } from "./taxa-elastic-query";

const wrapIntoResults = (schema: SchemaItem) => ({
	type: "object",
	properties: { results: schema, "@context": { type: "string" } }
});

const addVernacularNameTranslations = (schemaRef: ReferenceObject, document: OpenAPIObject) => {
	const schema: SchemaObject = parseURIFragmentIdentifierRepresentation(document, schemaRef.$ref);
	["vernacularNameFi", "vernacularNameSv", "vernacularNameEn"].forEach(property => {
		schema.properties![property] = { type: "string" };
	});
	return schema;
};

const addFiltersSchema = (document: OpenAPIObject, remoteDoc: OpenAPIObject) =>
	getFiltersSchema(remoteDoc);

@ApiTags("Taxon")
@LajiApiController("taxa")
export class TaxaController {

	constructor(private taxaService: TaxaService) {}

	/** Search taxons by name */
	@Version("1")
	@Get("search")
	@SwaggerRemoteRef({
		source: "laji-backend",
		ref: "TaxonSearchResponse",
		customizeResponseSchema: wrapIntoResults,
		jsonLdContext: "taxon-search"
	})
	@UseInterceptors(ResultsArray, Translator)
	search(@Query() query: TaxaSearchDto) {
		return this.taxaService.search(query);
	}

	/** Get a page of taxa */
	@Version("1")
	@Get()
	@SwaggerRemoteRef({
		source: "laji-backend",
		ref: "Taxon",
		jsonLdContext: "taxon-elastic"
	})
	@UseInterceptors(Translator, Serializer(TaxonElastic))
	getPage(@Query() query: GetTaxaPageDto, @Body() filters?: TaxaFilters) {
		return this.taxaService.getPage(query, filters);
	}

	/** Get a page of taxa with filters */
	@Version("1")
	@Post()
	@SwaggerRemoteRef({
		source: "laji-backend",
		ref: "Taxon",
		jsonLdContext: "taxon-elastic",
		customizeRequestBodySchema: addFiltersSchema
	})
	@ApiBody({ required: false })
	@UseInterceptors(Translator, Serializer(TaxonElastic))
	getPageWithFilters(@Query() query: GetTaxaPageDto, @Body() filters?: TaxaFilters) {
		return this.taxaService.getPage(query, filters);
	}

	/** Get an aggregate of taxa */
	@Get("aggregate")
	getAggregate(@Query() query: GetTaxaAggregateDto) {
		return this.taxaService.getAggregate(query);
	}

	/** Get an aggregate of taxa with filters */
	@Post("aggregate")
	getAggregateWithFilters(@Query() query: GetTaxaAggregateDto, @Body() filters?: TaxaFilters) {
		return this.taxaService.getAggregate(query, filters);
	}

	/** Get a page of species */
	@Version("1")
	@Get("species")
	@SwaggerRemoteRef({ source: "laji-backend", ref: "Taxon", jsonLdContext: "taxon-elastic" })
	@UseInterceptors(Translator, Serializer(TaxonElastic))
	getSpeciesPage(@Query() query: GetTaxaPageDto) {
		return this.taxaService.getSpeciesPage(query);
	}

	/** Get a page of species with filters */
	@Version("1")
	@Post("species")
	@SwaggerRemoteRef({
		source: "laji-backend",
		ref: "Taxon",
		jsonLdContext: "taxon-elastic",
		customizeRequestBodySchema: addFiltersSchema
	})
	@ApiBody({ required: false })
	@UseInterceptors(Translator, Serializer(TaxonElastic))
	getSpeciesPageWithFilters(@Query() query: GetTaxaPageDto, @Body() filters?: TaxaFilters) {
		return this.taxaService.getSpeciesPage(query, filters);
	}


	/** Get a species aggregate */
	@Get("species/aggregate")
	getSpeciesAggregate(@Query() query: GetTaxaAggregateDto) {
		return this.taxaService.getSpeciesAggregate(query);
	}

	/** Get a taxon by id */
	@Version("1")
	@Get(":id")
	@SwaggerRemoteRef({
		source: "laji-backend",
		ref: "Taxon",
		customizeResponseSchema: addVernacularNameTranslations, // It's done mutably, so we need to do it just once here.
		jsonLdContext: "taxon-elastic"
	})
	@UseInterceptors(Translator, Serializer(TaxonElastic))
	get(@Param("id") id: string, @Query() query: GetTaxonDto) {
		return this.taxaService.getBySubject(id, query);
	}

	/** Get children of a taxon */
	@Version("1")
	@Get(":id/children")
	@SwaggerRemoteRef({
		source: "laji-backend",
		ref: "Taxon",
		customizeResponseSchema: wrapIntoResults,
		jsonLdContext: "taxon-elastic"
	})
	@UseInterceptors(ResultsArray, Translator, Serializer(TaxonElastic))
	getTaxonChildren(@Param("id") id: string, @Query() query: GetTaxaResultsDto) {
		return this.taxaService.getChildren(id, query);
	}

	/** Get parents of a taxon */
	@Version("1")
	@Get(":id/parents")
	@SwaggerRemoteRef({
		source: "laji-backend",
		ref: "Taxon",
		customizeResponseSchema: wrapIntoResults,
		jsonLdContext: "taxon-elastic"
	})
	@UseInterceptors(ResultsArray, Translator, Serializer(TaxonElastic))
	getTaxonParents(@Param("id") id: string, @Query() query: GetTaxaResultsDto) {
		return this.taxaService.getTaxonParents(id, query);
	}

	/** Get species and subspecies of a taxon */
	@Version("1")
	@Get(":id/species")
	@SwaggerRemoteRef({ source: "laji-backend", ref: "Taxon", jsonLdContext: "taxon-elastic" })
	@UseInterceptors(Translator, Serializer(TaxonElastic))
	getTaxonSpeciesPage(@Param("id") id: string, @Query() query: GetTaxaPageDto) {
		return this.taxaService.getTaxonSpeciesPage(id, query);
	}

	/** Get an aggregate of species and subspecies of a taxon */
	@Get(":id/species/aggregate")
	getTaxonSpeciesAggregate(@Param("id") id: string, @Query() query: GetTaxaAggregateDto) {
		return this.taxaService.getTaxonSpeciesAggregate(id, query);
	}

	/** Get description texts of a taxon */
	@Version("1")
	@Get(":id/descriptions")
	@SwaggerRemoteRef({
		source: "laji-backend",
		ref: "Content",
		customizeResponseSchema: wrapIntoResults,
		jsonLdContext: "taxon-description"
	})
	@UseInterceptors(ResultsArray, Translator)
	getTaxonDescriptions(@Param("id") id: string, @Query() query: GetTaxaDescriptionsDto) {
		return this.taxaService.getTaxonDescriptions(id, query);
	}

	/** Get media objects of a taxon */
	@Version("1")
	@Get(":id/media")
	@SwaggerRemoteRef({
		source: "laji-backend",
		ref: "Image",
		customizeResponseSchema: wrapIntoResults,
		jsonLdContext: "taxon-media"
	})
	@UseInterceptors(ResultsArray, Translator)
	getTaxonMedia(@Param("id") id: string, @Query() query: GetTaxaDescriptionsDto) {
		return this.taxaService.getTaxonMedia(id, query);
	}
}
