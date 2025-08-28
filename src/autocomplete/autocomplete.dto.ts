import { IntersectionType } from "@nestjs/swagger";
import { PaginatedDto } from "src/pagination.utils";
import { CommaSeparatedStrings, IsOptionalBoolean } from "src/serialization/serialization.utils";
import { SearchMatchType } from "src/taxa/taxa.dto";

export class CommonAutocompleteDto extends IntersectionType(PaginatedDto) {
	/** Search term */
	query?: string;
}

export class GetFriendsDto extends IntersectionType(CommonAutocompleteDto) {}

export class GetFriendsResponseDto {
	key: string;
	value?: string;
	name?: string;
	group?: string;
};

// export class GetTaxaAutocompleteDto extends IntersectionType(CommonAutocompleteDto) {
// 	/** Limit results to specified checklist (default is FinBIF master checklist) */
// 	checklist?: string;
// 	/** Filter based on taxon set(s). Multiple values are separated by a comma (,). */
// 	@CommaSeparatedStrings() taxonSet?: string[];
// 	/** Limit results to specified informal taxon group(s). Multiple values are separated by a comma (,). */
// 	@CommaSeparatedStrings() informalTaxonGoup?: string[];
// 	/** Include hidden taxa in the response */
// 	@IsOptionalBoolean() includeHidden?: boolean;
// 	/**
// 	 * Matching names have a type (for example MX.vernacularName, MX.hasMisappliedName); List name types you want
// 	 * included in the search. Multiple values are separated by a comma (,).
// 	 */
// 	@CommaSeparatedStrings() includeNameTypes?: string[];
// 	/**
// 	 * Filter based on language of the matching name. List languages that you want to be included in the search. (Matches
// 	 * of names that are not of any language are uninfected; for example scientific names). Multiple values are separated
// 	 * by a comma (,).'
// 	 */
// 	@CommaSeparatedStrings() includeLanguages?: string[];
// 	/** Exclude taxa from specified informal taxon group(s). Multiple values are separated by a comma (,). */
// 	@CommaSeparatedStrings() excludedInformalTaxonGroup?: string[];
// 	/**
// 	 * Default: All match types; exact = exact matches, partial = partially matching, likely = fuzzy matching.
// 	 * Multiple values are separated by a comma (,)
// 	 */
// 	@CommaSeparatedStrings() matchType?: SearchMatchType[];
// 	/**
// 	 * Matching names have a type (for example MX.vernacularName, MX.hasMisappliedName); List name types you do not want
// 	 * included in the search. Multiple values are separated by a comma (,).
// 	 */
// 	@CommaSeparatedStrings() excludeNameTypes?: string[];
// 	/** Filter to include only species (and subspecies) */
// 	@IsOptionalBoolean() onlySpecies?: boolean;
// 	/** Filter to include only finnish taxa */
// 	@IsOptionalBoolean() onlyFinnish?: boolean;
// 	/** Filter to include only invasive species */
// 	@IsOptionalBoolean() onlyInvasive?: boolean;
// 	/** Include the search string to the result list if no exact match was found */
// 	@IsOptionalBoolean() includeNonMatching?: boolean;
// }
