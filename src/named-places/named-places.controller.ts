import { Body, Delete, Get, Param, Post, Put, Query, UseInterceptors } from "@nestjs/common";
import { AllowedPageQueryKeys, NamedPlacesService } from "./named-places.service";
import { GetNamedPlaceDto, GetNamedPlacePageDto, NamedPlace, ReservationDto } from "./named-places.dto";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { FilterUnitsInterceptor } from "./filter-units.interceptor";
import { ApiTags } from "@nestjs/swagger";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { pickAndSerialize } from "src/serializing/serializing";
import { PaginatedDto } from "src/pagination";
import { QueryWithPersonTokenDto } from "src/common.dto";

@ApiTags("Named places")
@LajiApiController("named-places")
export class NamedPlacesController {
	constructor(private namedPlacesService: NamedPlacesService) {}

	/** Get a page of named places */
	@Get()
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	@UseInterceptors(FilterUnitsInterceptor)
	getPage(@Query() query: GetNamedPlacePageDto): Promise<PaginatedDto<NamedPlace>> {
		const { personToken, page, pageSize, selectedFields, includePublic, ...q } = query;
		(q as Record<string, unknown>).id = q.idIn;
		const safeQuery = pickAndSerialize(NamedPlace, q, ...AllowedPageQueryKeys);
		return this.namedPlacesService.getPage(
			safeQuery,
			personToken,
			includePublic,
			page,
			pageSize,
			selectedFields
		);
	}

	/** Get a named place by id */
	@Get(":id")
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	@UseInterceptors(FilterUnitsInterceptor)
	get(@Param("id") id: string, @Query() { personToken }: GetNamedPlaceDto): Promise<NamedPlace> {
		return this.namedPlacesService.get(id, personToken);
	}

	/** Create a new named place */
	@Post()
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	create(@Body() place: NamedPlace, @Query() { personToken }: QueryWithPersonTokenDto): Promise<NamedPlace>  {
		return this.namedPlacesService.create(place, personToken);
	}

	/** Update an existing named place */
	@Put()
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	update(
		@Param("id") id: string,
		@Body() place: NamedPlace,
		@Query() { personToken }: QueryWithPersonTokenDto
	): Promise<NamedPlace>  {
		return this.namedPlacesService.update(id, place, personToken);
	}

	/** Delete a named place */
	@Delete(":id")
	delete(@Param("id") id: string, @Query() { personToken }: QueryWithPersonTokenDto): Promise<NamedPlace>  {
		return this.namedPlacesService.delete(id, personToken);
	}

	/** Create a new named place */
	@Post(":id/reservation")
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	reserve(@Param("id") id: string, @Query() { personToken, personID, until }: ReservationDto): Promise<NamedPlace>  {
		return this.namedPlacesService.reserve(id, personToken, personID, until);
	}
}
