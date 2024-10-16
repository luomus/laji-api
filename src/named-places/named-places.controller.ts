import { Body, Delete, Get, Param, Post, Put, Query, UseInterceptors } from "@nestjs/common";
import { AllowedPageQueryKeys, NamedPlacesService } from "./named-places.service";
import { GetNamedPlaceDto, GetNamedPlacePageDto, NamedPlace, ReservationDto } from "./named-places.dto";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { FilterUnitsInterceptor } from "./filter-units.interceptor";
import { ApiTags } from "@nestjs/swagger";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { pickAndSerialize } from "src/serialization/serialization.utils";
import { PaginatedDto } from "src/pagination.utils";
import { QueryWithPersonTokenDto } from "src/common.dto";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";

@ApiTags("Named places")
@LajiApiController("named-places")
export class NamedPlacesController {
	constructor(private namedPlacesService: NamedPlacesService) {}

	/** Reserve an existing named place */
	@Post(":id/reservation")
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	reserve(
		@Param("id") id: string,
		@Query() { personID, until }: ReservationDto,
		@PersonToken() person: Person
	) : Promise<NamedPlace> {
		return this.namedPlacesService.reserve(id, person, personID, until);
	}

	/** Cancel a reservation for a named place */
	@Delete(":id/reservation")
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	cancelReservation(
		@Param("id") id: string,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person
	) {
		return this.namedPlacesService.cancelReservation(id, person);
	}

	/** Get a page of named places */
	@Get()
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	@UseInterceptors(FilterUnitsInterceptor)
	getPage(
		@Query() query: GetNamedPlacePageDto,
		@PersonToken({ required: false }) person?: Person
	): Promise<PaginatedDto<NamedPlace>> {
		const { page, pageSize, selectedFields, includePublic, ...q } = query;
		(q as Record<string, unknown>).id = q.idIn;
		const safeQuery = pickAndSerialize(NamedPlace, q, ...AllowedPageQueryKeys);
		return this.namedPlacesService.getPage(
			safeQuery,
			person,
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
	get(
		@Param("id") id: string,
		@Query() _: GetNamedPlaceDto,
		@PersonToken({ required: false }) person: Person
	): Promise<NamedPlace> {
		return this.namedPlacesService.get(id, person);
	}

	/** Create a new named place */
	@Post()
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	create(
		@Body() place: NamedPlace,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person
	): Promise<NamedPlace>  {
		return this.namedPlacesService.create(place, person);
	}

	/** Update an existing named place */
	@Put(":id")
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	update(
		@Param("id") id: string,
		@Body() place: NamedPlace,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person
	): Promise<NamedPlace>  {
		return this.namedPlacesService.update(id, place, person);
	}

	/** Delete a named place */
	@Delete(":id")
	delete(@Param("id") id: string,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person
	) {
		return this.namedPlacesService.delete(id, person);
	}
}
