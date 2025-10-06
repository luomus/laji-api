import { NamedPlace as NamedPlaceClass } from "@luomus/laji-schema/classes";
import { Document } from "@luomus/laji-schema";
import { Unit } from "@luomus/laji-schema/interfaces";
import { IntersectionType, OmitType } from "@nestjs/swagger";
import { Exclude, Type } from "class-transformer";
import { QueryWithPagingDto } from "src/common.dto";
import { CommaSeparatedStrings, IsOptionalBoolean } from "src/serialization/serialization.utils";
import type { Geometry } from "geojson";

export class NamedPlace extends OmitType(NamedPlaceClass, ["geometry", "prepopulatedDocument", "acceptedDocument"]) {
	id: string;
	geometry: Geometry;
	public = false;
	owners: string[] = [];
	/** Read access, not edit access */
	editors: string[] = [];

	prepopulatedDocument?: Document;
	acceptedDocument?: Document;
}

class GatheringUnitsFiltered {
	@Exclude() units: Unit[];
}

class DocumentUnitsFiltered {
	@Type(() => GatheringUnitsFiltered) gatherings: GatheringUnitsFiltered[];
}

export class NamedPlaceUnitsFiltered {
	@Type(() => DocumentUnitsFiltered) prepopulatedDocument?: DocumentUnitsFiltered;
	@Type(() => DocumentUnitsFiltered) acceptedDocument?: DocumentUnitsFiltered;
}

export class GetNamedPlaceDto {
	/** Person's authentication token. Necessary for fetching non public places. */
	personToken?: string;
	/** Include units in prepopulated and accepted documents (only for forms with 'MHL.includeUnits' true). */
	@IsOptionalBoolean()
	includeUnits?: boolean = false;
}

export class GetNamedPlacePageDto extends IntersectionType(
	QueryWithPagingDto
) {
	/** Collection id. Child collections are also fetched. */
	collectionID: string;

	/** Include only items with these ids. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() idIn?: string[];

	/** alternative ID. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() alternativeIDs?: string[];

	/** municipality area code. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() municipality?: string[];

	/** bird association area code. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() birdAssociationArea?: string[];

	/** Return only selected fields per place. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() selectedFields?: (keyof NamedPlace)[];

	@CommaSeparatedStrings() taxonIDs?: string[];

	/** Filter by tags. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() tags?: string[];

	/** Include public named places (used only when personToken is given). Defaults to true. */
	@IsOptionalBoolean() includePublic?: boolean = true;

	/** Include units in prepopulated and accepted documents (only form forms with 'MHL.includeUnits' true). Defaults to false. */
	@IsOptionalBoolean() includeUnits?: boolean = false;
}

export class ReservationDto {
	/** Id for the person (your own id will be used if you are not admin) */
	personID?: string;
	/** The date when the reservation expires */
	until?: string;
}
