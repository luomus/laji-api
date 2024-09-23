import { Area as AreaI } from "@luomus/laji-schema";
import { HasContext, LangQueryDto, PagedDto } from "../common.dto";
import { IntersectionType } from "@nestjs/swagger";
import { CommaSeparatedStrings } from "src/serializing/serializing";

export type Area = AreaI & HasContext & { id: string };

export enum AreaTypeDto {
	country = "country",
	biogeographicalProvince = "biogeographicalProvince",
	municipality = "municipality",
	oldMunicipality = "oldMunicipality",
	birdAssociationArea = "birdAssociationArea",
	iucnEvaluationArea = "iucnEvaluationArea",
}

export class GetAreaPageDto extends IntersectionType(
	PagedDto,
	LangQueryDto
) {
	/** Area type */
	type?: AreaTypeDto;
	/**	Include only items with the given ids. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() idIn?: string[];
}
