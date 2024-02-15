import { Body, Get, Param, Post, Query, UseInterceptors } from "@nestjs/common";
import { NamedPlacesService } from "./named-places.service";
import { CreateNamedPlaceDto, GetNamedPlaceDto, GetNamedPlacePageDto, NamedPlace } from "./named-places.dto";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { FilterUnitsInterceptor } from "./filter-units.interceptor";
import { ApiTags } from "@nestjs/swagger";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { pickAndSerialize } from "src/serializing/serializing";
import { PaginatedDto } from "src/pagination";

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
		const safeQuery = pickAndSerialize(NamedPlace, q,
			"alternativeIDs"
			, "municipality"
			, "birdAssociationArea"
			, "collectionID"
			, "tags"
			, "public"
		);
		return this.namedPlacesService.getPage(
			safeQuery,
			personToken,
			includePublic,
			page,
			pageSize,
			selectedFields
		);
	}

	/** Create a new named place */
	@Post()
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	create(@Body() place: NamedPlace, @Query() { personToken }: CreateNamedPlaceDto): Promise<NamedPlace>  {
		return this.namedPlacesService.create(place, personToken);
	}

	/** Get a named place by id */
	@Get(":id")
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	@UseInterceptors(FilterUnitsInterceptor)
	get(@Param("id") id: string, @Query() { personToken }: GetNamedPlaceDto): Promise<NamedPlace> {
		return this.namedPlacesService.get(id, personToken);
	}

}
