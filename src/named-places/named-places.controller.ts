import { Body, Delete, Get, Param, Post, Put, Query, UseInterceptors } from "@nestjs/common";
import { AllowedPageQueryKeys, NamedPlacesService } from "./named-places.service";
import { GetNamedPlacePageDto, NamedPlace, ReservationDto } from "./named-places.dto";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { FilterUnitsInterceptor } from "./filter-units.interceptor";
import { ApiTags } from "@nestjs/swagger";
import { SwaggerRemote } from "src/swagger/swagger-remote.decorator";
import { pickAndSerialize } from "src/serialization/serialization.utils";
import { RequestPerson }from "src/decorators/request-person.decorator";
import { Person } from "src/persons/person.dto";

@ApiTags("Named places")
@LajiApiController("named-places")
export class NamedPlacesController {
	constructor(private namedPlacesService: NamedPlacesService) {}

	/** Reserve an existing named place */
	@Post(":id/reservation")
	@SwaggerRemote({ source: "store", ref: "/namedPlace", applyToRequest: false })
	reserve(
		@Param("id") id: string,
		@Query() { personID, until }: ReservationDto,
		@RequestPerson() person: Person
	) : Promise<NamedPlace> {
		return this.namedPlacesService.reserve(id, person, personID, until);
	}

	/** Cancel a reservation for a named place */
	@Delete(":id/reservation")
	@SwaggerRemote({ source: "store", ref: "/namedPlace" })
	cancelReservation(
		@Param("id") id: string,
		@RequestPerson() person: Person
	) {
		return this.namedPlacesService.cancelReservation(id, person);
	}

	/** Get a page of named places */
	@Get()
	@SwaggerRemote({ source: "store", ref: "/namedPlace" })
	@UseInterceptors(FilterUnitsInterceptor)
	getPage(
		@Query() query: GetNamedPlacePageDto,
		@RequestPerson({
			required: false,
			description: "Person's authentication token. Necessary for fetching private places"
		}) person?: Person
	) {
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
	@SwaggerRemote({ source: "store", ref: "/namedPlace" })
	@UseInterceptors(FilterUnitsInterceptor)
	get(
		@Param("id") id: string,
		@RequestPerson({
			required: false,
			description: "Person's authentication token. Necessary for fetching private places"
		}) person: Person
	): Promise<NamedPlace> {
		return this.namedPlacesService.get(id, person);
	}

	/** Create a new named place */
	@Post()
	@SwaggerRemote({ source: "store", ref: "/namedPlace" })
	create(
		@Body() place: NamedPlace,
		@RequestPerson() person: Person
	): Promise<NamedPlace>  {
		return this.namedPlacesService.create(place, person);
	}

	/** Update an existing named place */
	@Put(":id")
	@SwaggerRemote({ source: "store", ref: "/namedPlace" })
	update(
		@Param("id") id: string,
		@Body() place: NamedPlace,
		@RequestPerson() person: Person
	): Promise<NamedPlace>  {
		return this.namedPlacesService.update(id, place, person);
	}

	/** Delete a named place */
	@Delete(":id")
	delete(@Param("id") id: string,
		@RequestPerson() person: Person
	) {
		return this.namedPlacesService.delete(id, person);
	}
}
