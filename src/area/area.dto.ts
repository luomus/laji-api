import { Area as AreaI } from "@luomus/laji-schema";
import { HasJsonLdContext, QueryWithPagingDto } from "../common.dto";
import { IntersectionType } from "@nestjs/swagger";
import { CommaSeparatedStrings } from "src/serialization/serialization.utils";

export type Area = AreaI & HasJsonLdContext & { id: string };

export enum AreaTypeDto {
	country = "ML.country",
	biogeographicalProvince = "ML.biogeographicalProvince",
	municipality = "ML.municipality",
	oldMunicipality = "ML.oldMunicipality",
	birdAssociationArea = "ML.birdAssociationArea",
	iucnEvaluationArea = "ML.iucnEvaluationArea",
}

export class GetAreaPageDto extends IntersectionType(
	QueryWithPagingDto,
) {
	// For backward compatibility. We're going to deprecate it and use areaType.
	type?: unknown;

	/** Area type */
	areaType?: AreaTypeDto;

	/**	Include only items with the given ids. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() idIn?: string[];
}
