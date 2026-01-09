import { InformalTaxonGroup as _InformalTaxonGroup } from "@luomus/laji-schema/classes";
import { ApiHideProperty, ApiProperty, IntersectionType, OmitType, PickType } from "@nestjs/swagger";
import { Exclude, Type } from "class-transformer";
import { IsInt } from "class-validator";
import { HasSelectedFields, MultiLang, QueryWithPagingDto } from "src/common.dto";
import { CommaSeparatedStrings, IsOptionalBoolean } from "src/serialization/serialization.utils";
import { WithNonNullableKeys } from "src/typing.utils";

export enum ChecklistVersion {
	"current" = "current",
	"MR.424" = "MR.424",
	"MR.425" = "MR.425",
	"MR.426" = "MR.426",
	"MR.427" = "MR.427",
	"MR.428" = "MR.428",
	"MR.484" = "MR.484",
}

export class TaxaBaseQuery {
	/** Include taxa from the specified checklists (defaults to FinBIF master checklist) */
	@ApiProperty({
		  required: false,
		  default: "MR.1",
	})
	@CommaSeparatedStrings()
	checklist?: string[] = ["MR.1"];

	/** Checklist version to be used. Defaults to the latest version. */
	checklistVersion?: ChecklistVersion = ChecklistVersion.current;
}

class HasParentTaxonId {
	/**	Filter based on parent taxon id */
	parentTaxonId?: string;
}

export class SimpleFilters {
	/** Filter based on given informal groups. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() informalTaxonGroups?: string[];

	/**
	 * true: Will include only invasive taxa.
	 * false: Will exclude invasive taxa.
	 */
	@IsOptionalBoolean() invasiveSpecies?: boolean;

	/**
	 * true: Will include only finnish taxa.
	 * false: Will exclude finnish taxa.
	 */
	@IsOptionalBoolean() finnish?: boolean;


	/** Filter by comma separated ids */
	@CommaSeparatedStrings() id?: string[];
}

const SimpleFiltersKeys: (keyof SimpleFilters)[] = ["informalTaxonGroups", "invasiveSpecies", "finnish", "id"];

class Inclusions {

	/** Include media objects in the response. Defaults to false. */
	@IsOptionalBoolean() includeMedia?: boolean = false;

	/** Include description objects in the response. Defaults to false. */
	@IsOptionalBoolean() includeDescriptions?: boolean = false;

	/** Include red list evaluations in the response. Defaults to false.*/
	@IsOptionalBoolean() includeRedListEvaluations?: boolean = false;
}

class HasIncludeHidden {
	/**
	 * true: Will show hidden taxa
	 * false: Hidden taxa are skipped and their non-hidden children raised up in the tree.
	 */
	@IsOptionalBoolean() includeHidden?: boolean = false;
}

class PageLikeTaxaQuery extends IntersectionType(
	QueryWithPagingDto,
	SimpleFilters,
	HasSelectedFields,
	Inclusions,
	HasIncludeHidden
) {
	/**
	 * Sorting field of the species (one of 'taxonomic' | 'scientificName' | 'finnishName') and optional sort order 'desc' | 'asc'.
	 * Order defaults to 'asc'. The sort field and order are separated by a space character.
	 *
	 * Defaults to 'taxonomic'
	 */
	sortOrder?: string = "taxonomic";
}

export class GetTaxaPageDto extends IntersectionType(TaxaBaseQuery, PageLikeTaxaQuery, HasParentTaxonId) { }

export class GetTaxaPageWithFiltersDto extends OmitType(GetTaxaPageDto, SimpleFiltersKeys) { }

export class GetTaxaAggregateDto extends IntersectionType(
	TaxaBaseQuery,
	SimpleFilters,
	HasParentTaxonId,
	HasIncludeHidden
) {
	/**
	 * Aggregate by these fields. Multiple values are separated by a comma (,). Different aggregations can be made at the
	 * same time using semicolon as separator (;) and aggregates can be named giving "=name" at the end of each
	 * aggregation.
	 *
	 * Result will have aggregations property object where the keys of the object are either the field(s) that were used
	 * or the name if it was given.
	 * */
	@CommaSeparatedStrings(";") aggregateBy: string[];
	@Type(() => Number) @IsInt() aggregateSize?: number = 10;
}

export class GetTaxaAggregateWithFiltersDto extends OmitType(GetTaxaAggregateDto, SimpleFiltersKeys) {}

export class GetTaxonDto extends IntersectionType(
	HasSelectedFields,
	Inclusions,
	PickType(TaxaBaseQuery, ["checklistVersion"])
) {}

export class GetTaxaResultsDto extends OmitType(GetTaxaPageDto, ["page", "pageSize"]) {}

export type AllQueryParams  = TaxaBaseQuery & PageLikeTaxaQuery & GetTaxaAggregateDto & {
	depth?: boolean;
};

class InformalTaxonGroup extends _InformalTaxonGroup {
	id: string;
}

export type Taxon = {
	vernacularName?: string;
	scientificName?: string;
	informalGroups?: WithNonNullableKeys<InformalTaxonGroup, "id">[];
	matchingName: string;
	id: string;
	type?: "exactMatches";
}

class RedListEvaluation {
	@Exclude() primaryHabitatSearchStrings: string;
	@Exclude() anyHabitatSearchStrings: string;
}

export class TaxonElastic {
	@Type(() => RedListEvaluation) latestRedListEvaluation: RedListEvaluation;
	@Exclude() isPartOf: any;
	@Exclude() isPartOfNonHidden: any;
	@Exclude() depth: any;
	@Exclude() nonHiddenDepth: any;
	@Exclude() nonHiddenParents: string[];
	nameAccordingTo: string;
	vernacularName: MultiLang;
	colloquialVernacularName: MultiLang;
	[key: string]: unknown;
}

export enum SearchMatchType {
	exact = "exact",
	partial = "partial",
	likely = "likely"
}

export class TaxaSearchDto {
	query: string;

	// Used only internally
	@ApiHideProperty() q?: string;

	/** Limit the number of results */
	limit?: number = 10;

	// Used only internally
	@ApiHideProperty() id?: string;

	/** Include taxa from the specified checklists (defaults to FinBIF master checklist) */
	checklist?: string;

	/** Filter based on taxon set(s). Multiple values are separated by a comma (,) */
	taxonSets?: string;

	/** Search taxa from specified informal taxon group(s). Multiple values are separated by a comma (,). An exclamation mark in the beginning of a matches exclusively. */
	informalTaxonGroups?: string;

	/** Include hidden taxa in the response */
	includeHidden?: boolean = false;

	/** Filter by type of the matching name (e.g., MX.vernacularName, MX.hasMisappliedName). Multiple values are separated by a comma (,). An exclamation mark in the beginning of a matches exclusively. */
	nameTypes?: string;

	/** Filters by the language of the matching name. Multiple values can be specified, separated by commas (,). This applies only to name types that are available in multiple languages (e.g., MX.vernacularName) and does not apply to scientific names. */
	languages?: string;

	/** Default: All match types; exact = exact matches, partial = partially matching, likely = fuzzy matching. Multiple values are separated by a comma (,) */
	matchType?: string;

	/** 
	 * true: Will include only "lower taxa" (species, subspecies, aggregates, ...)
	 * false: Will only include "higher taxa" (genus and above)
	 * */
	@IsOptionalBoolean() species?: boolean;

	/**
	 * true: Will include only finnish taxa.
	 * false: Will exclude finnish taxa.
	 */
	@IsOptionalBoolean() finnish?: boolean;

	/** Filter to include only invasive species */
	@IsOptionalBoolean() invasiveSpecies?: boolean;

	/** Multiple values are separated by a comma (,) */
	selectedFields?: string;
}
