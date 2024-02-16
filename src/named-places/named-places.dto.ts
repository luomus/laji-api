import { NamedPlace as NamedPlaceI } from "@luomus/laji-schema";
import { Document } from "@luomus/laji-schema";
import { IntersectionType, OmitType, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { PagedDto, QueryWithCollectionID, QueryWithPersonTokenDto } from "src/common.dto";
import { Person } from "src/persons/person.dto";
import { Private } from "src/serializing/private.decorator";
import { CommaSeparatedIds, IsOptionalBoolean } from "src/serializing/serializing";
import type { Geometry } from "geojson";

export class NamedPlace implements Omit<NamedPlaceI, "geometry" | "prepopulatedDocument" | "acceptedDocument"> {
	id: string;
	name: string;
	geometry: Geometry;
	public = false;
	owners: string[] = [];
	/** Read access, not edit access */
	editors: string[] = [];
	collectionID?: string;
	prepopulatedDocument?: Partial<Document>;
	acceptedDocument?: Partial<Document>;

	alternativeIDs?: string[];
	municipality?: string[];
	birdAssociationArea?: string[];
	tags?: NamedPlaceI["tags"];

	isEditableFor(person: Person): boolean {
		return this.owners.includes(person.id) || (this.editors?.includes(person.id));
	}
}

class GatheringUnitsFiltered {
	@Private() units: Record<string, unknown>[];
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
	/** Include units in prepopulated and accepted documents (only form forms with 'MHL.includeUnits' true). */
	@IsOptionalBoolean()
	includeUnits?: boolean = false;
}

export class GetNamedPlacePageDto extends IntersectionType(
	PartialType(QueryWithPersonTokenDto),
	PartialType(QueryWithCollectionID),
	PagedDto
) {
	/** alternative ID */
	@CommaSeparatedIds() alternativeIDs?: string[];
	/** municipality area code */
	@CommaSeparatedIds() municipality?: string[];
	/** bird association area code */
	@CommaSeparatedIds() birdAssociationArea?: string[];
	/** Return only selected fields per place. Multiple values are separated by a comma (,). */
	@CommaSeparatedIds() selectedFields?: (keyof NamedPlace)[];
	@CommaSeparatedIds() taxonIDs?: string[];
	/** Filter by tags. Multiple values are separated by a comma (,). */
	@CommaSeparatedIds() tags?: string[];
	/** Include public named places (used only when personToken is given) */
	@IsOptionalBoolean() includePublic?: boolean = true;
	/** Include units in prepopulated and accepted documents (only form forms with 'MHL.includeUnits' true). */
	@IsOptionalBoolean() includeUnits?: boolean = false;
}
