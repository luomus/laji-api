import { Area as AreaI, AreaTypeEnum } from "@luomus/laji-schema";
import { HasContext, LangQueryDto, PagedDto } from "../common.dto";
import { IntersectionType } from "@nestjs/swagger";
import { CommaSeparatedStrings } from "src/serializing/serializing";

export type Area = AreaI & HasContext & { id: string };

export enum AreaTypeDto {
	country = "ML.country",
	biogeographicalProvince = "ML.biogeographicalProvince",
	municipality = "ML.municipality",
	oldMunicipality = "ML.oldMunicipality",
	birdAssociationArea = "ML.birdAssociationArea",
	iucnEvaluationArea = "ML.iucnEvaluationArea",
}

export class GetAreaPageDto extends IntersectionType(
	PagedDto,
	LangQueryDto
) {
	// For backward compatibility. We're going to deprecate it and use areaType.
	type?: unknown;
	/** Area type */
	areaType?: AreaTypeDto;
	/**	Include only items with the given ids. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() idIn?: string[];
}
