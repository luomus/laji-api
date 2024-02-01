import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { NamedPlacesService } from "./named-places.service";
import { GetNamedPlaceDto, GetNamedPlacePageDto, NamedPlace } from "./named-places.dto";
import { LajiApiController } from "src/decorators/laji-api-controller";
import { FilterUnitsInterceptor } from "./filter-units.interceptor";
import { ApiTags } from "@nestjs/swagger";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { pickAndSerialize } from "src/serializing/serializing";

@ApiTags("Named places")
@LajiApiController("named-places")
export class NamedPlacesController {
	constructor(private namedPlacesService: NamedPlacesService) {}

	@Get("")
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	@UseInterceptors(FilterUnitsInterceptor)
	getPage(@Query() query: GetNamedPlacePageDto) {
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

	@Get(":id")
	@SwaggerRemoteRef({ source: "store", ref: "namedPlace" })
	@UseInterceptors(FilterUnitsInterceptor)
	get(@Param("id") id: string, @Query() { personToken }: GetNamedPlaceDto) {
		return this.namedPlacesService.get(id, personToken);
	}

}
