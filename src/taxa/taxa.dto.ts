import { InformalTaxonGroup as _InformalTaxonGroup } from "@luomus/laji-schema/classes";
import { ApiHideProperty, ApiProperty, IntersectionType, OmitType, PickType } from "@nestjs/swagger";
import { Exclude, Transform, Type, plainToInstance } from "class-transformer";
import { IsInt, IsNumber, IsOptional } from "class-validator";
import { MultiLangDto, QueryWithLangDto, QueryWithPagingDto } from "src/common.dto";
import { RemoteSwaggerSchema } from "src/decorators/remote-swagger-schema.decorator";
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

export class TaxaBaseQuery extends IntersectionType(QueryWithPagingDto, QueryWithLangDto) {
	/**	Show only taxa that have been marked as species */
	@IsOptionalBoolean() species?: boolean = false;

	/**	Filter based on parent taxon id */
	parentTaxonId?: string;

	/** Filter based on given informal group(s). Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() informalGroupFilters?: string[];

	/** Filter based on IUCN red list taxon group(s). Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() redListEvaluationGroups?: string[];

	/** Filter based on invasive species main group(s). Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() invasiveSpeciesMainGroups?: string[];

	/** Filter based on administrative status(es). Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() adminStatusFilters?: string[];

	/** Filter based on the latest red list statu(es). Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() redListStatusFilters?: string[];

	/** Filter based on type(s) of occurrence. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() typesOfOccurrenceFilters?: string[];

	/** Will not include these type(s) of occurrence. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() typesOfOccurrenceNotFilters?: string[];

	/** Filter based on taxon primary habitat. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() primaryHabitat?: string[];

	/** Filter based on taxon any habitat.Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() anyHabitat?: string[];

	/** When true will only include taxa which have latest red list evaluation and when false will list those species that don't have the evaluation */
	@IsOptionalBoolean() hasLatestRedListEvaluation?: boolean;

	/** Filter based on the latest red list evaluation threatened at area(s). Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() "latestRedListEvaluation.threatenedAtArea"?: string[];

	/** Filter based on the latest red list evaluation statu(es). Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() "latestRedListEvaluation.redListStatus"?: string[];

	/** Filter based on taxon primary habitat. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() "latestRedListEvaluation.primaryHabitat"?: string[];

	/** Filter based on taxon any habitat. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() "latestRedListEvaluation.anyHabitat"?: string[];

	/** Filter based on taxon primary threat. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() "latestRedListEvaluation.primaryThreat"?: string[];

	/** Filter based on taxon threats. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() "latestRedListEvaluation.threats"?: string[];

	/** Filter based on taxon primary endangerment reason. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() "latestRedListEvaluation.primaryEndangermentReason"?: string[];

	/** Filter based on taxon endangerment reasons. Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() "latestRedListEvaluation.endangermentReasons"?: string[];

	/** Filter based on taxon rank(s). Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() taxonRanks?: string[];

	/** Filter based on taxon set(s). Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() taxonSets?: string[];

	/**
	 * true: Will include only invasive species.
	 * false: Will exclude invasive species.
	 */
	@IsOptionalBoolean() invasiveSpeciesFilter?: boolean;

	/**
	 * true: include only species that have media objects attached
	 * false: exclude species that have media objects attached
	 */
	@IsOptionalBoolean() hasMediaFilter?: boolean;

	/**
	 * true: include only species that have description objects attached
	 * false: exclude species that have description objects attached
	 */
	@IsOptionalBoolean() hasDescriptionFilter?: boolean;

	/**
	 * true: include only species that have BOLD data
	 * false: exclude species that have BOLD data
	 */
	@IsOptionalBoolean() hasBoldData?: boolean;

	/**
	 * true: Will show hidden taxa
	 * false: Hidden taxa are skipped and their non-hidden children raised up in the tree.
	 */
	@IsOptionalBoolean() includeHidden?: boolean = false;

	/** Include media objects in the response */
	@IsOptionalBoolean() includeMedia?: boolean = false;

	/** Include description objects in the response */
	@IsOptionalBoolean() includeDescriptions?: boolean = false;

	/** Include red list evaluations in the response */
	@IsOptionalBoolean() includeRedListEvaluations?: boolean = false;

	/** Will include only finnish species */
	@IsOptionalBoolean() onlyFinnish?: boolean = false;

	/** Select fields to include in the result. Multiple values are separated by a comma (,) */
	@CommaSeparatedStrings() selectedFields?: string[];

	/** Search taxon from specified checklist (defaults to FinBIF master checklist) */
	checklist?: string = "MR.1";

	/** Checklist version to be used. Defaults to the latest version. */
	checklistVersion?: ChecklistVersion = ChecklistVersion.current;

	/**
	 * Sorting field of the species (one of 'taxonomic' | 'scientific_name' | 'finnish_name') and optional sort order 'desc' | 'asc'.
	 * Order defaults to 'asc'. The sort field and order are separated by a space character.
	 *
	 * Defaults to 'taxonomic'
	 * */
	sortOrder?: string = "taxonomic";

	/**
	 * Aggregate by these fields. Multiple values are separated by a comma (,). Different aggregations can be made at the
	 * same time using semicolon as separator (;) and aggregates can be named giving "=name" at the end of each
	 * aggregation.
	 *
	 * Result will have aggregations property object where the keys of the object are either the field(s) that were used
	 * or the name if it was given.
	 * */
	@CommaSeparatedStrings(";") aggregateBy: string[];
	@Type(() => Number) @IsInt() aggregateSize = 10;

	// { These are never in the query params really. We include them in this base class so the taxa service's
	// `queryToElasticQuery` can handle it.
	@ApiHideProperty() id?: string;
	@ApiHideProperty() ids?: string[];
	@ApiHideProperty() parents?: string;
	@ApiHideProperty() nonHiddenParents?: string;
	@ApiHideProperty() nonHiddenParentsIncludeSelf?: string;
	@ApiHideProperty() parentsIncludeSelf?: string;
	@ApiHideProperty() depth?: boolean;
	// }
}

export class GetTaxaPageDto extends OmitType(TaxaBaseQuery, ["aggregateBy", "aggregateSize"]) {}

export class GetTaxaAggregateDto extends OmitType(
	TaxaBaseQuery,
	["page", "pageSize", "lang", "sortOrder", "parentTaxonId"]
) {}

export class GetSpeciesPageDto extends OmitType(
	GetTaxaPageDto,
	["species", "parentTaxonId", "taxonRanks"]
) {}

export class GetSpeciesAggregateDto extends OmitType(
	GetTaxaAggregateDto,
	["species"]
) {}

export class GetTaxonDto extends PickType(TaxaBaseQuery, [
	"lang",
	"langFallback",
	"selectedFields",
	"includeMedia",
	"includeDescriptions",
	"includeRedListEvaluations",
	"includeHidden"
]) {}

export class GetTaxaChildrenDto extends OmitType(TaxaBaseQuery, ["aggregateBy", "aggregateSize", "page", "pageSize"]) {}

export class GetTaxaParentsDto extends PickType(
	TaxaBaseQuery,
	["lang", "langFallback", "selectedFields", "checklistVersion"]
) {}

export class GetTaxaDescriptionsDto extends PickType(TaxaBaseQuery, ["checklistVersion", "lang", "langFallback"]) {}

class InformalTaxonGroup extends _InformalTaxonGroup {
	id: string;
}

export type Taxon = {
		vernacularName?: string;
		informalGroups?: WithNonNullableKeys<InformalTaxonGroup, "id">[];
}

class RedListEvaluation {
	@Exclude() primaryHabitatSearchStrings: string;
	@Exclude() anyHabitatSearchStrings: string;
}

@RemoteSwaggerSchema({
	swaggerHostConfigKey: "LAJI_BACKEND_HOST",
	swaggerPath: "openapi-v3.json",
	ref: "Taxon"
})
export class TaxonElastic {
	intellectualRights: string = "MZ.intellectualRightsCC-BY-4.0";
	@Type(() => RedListEvaluation) latestRedListEvaluation: RedListEvaluation;
	@Exclude() isPartOf: any;
	@Exclude() isPartOfNonHidden: any;
	@Exclude() depth: any;
	@Exclude() nonHiddenDepth: any;
	@Exclude() nonHiddenParents: string[];
	nameAccordingTo: string;
	[key: string]: unknown;
}

@RemoteSwaggerSchema({
	swaggerHostConfigKey: "LAJI_BACKEND_HOST",
	swaggerPath: "openapi-v3.json",
	ref: "TaxonSearchResponse"
})
export class TaxonSearchResponse { }

@RemoteSwaggerSchema({
	swaggerHostConfigKey: "LAJI_BACKEND_HOST",
	swaggerPath: "openapi-v3.json",
	ref: "Content"
})
export class TaxonElasticDescription { }

@RemoteSwaggerSchema({
	swaggerHostConfigKey: "LAJI_BACKEND_HOST",
	swaggerPath: "openapi-v3.json",
	ref: "Image"
})
export class TaxonElasticMedia { }

export class TaxaSearchDto extends QueryWithLangDto {
	/** Name to search */
	@ApiProperty({ name: "query" }) q: string;

	// Used only internally
	@ApiHideProperty() id?: string;

	/** Limit the page size of results */
	limit?: number = 10;

	/** Search taxon from specified checklist (defaults to FinBIF master checklist) */
	checklist?: string;

	/** Filter based on taxon set(s). Multiple values are separated by a comma (,) */
	taxonSets?: string;

	/** Search taxa from specified informal taxon group(s). Multiple values are separated by a comma (,) */
	informalTaxonGroup?: string;

	/** Include hidden taxa in the response */
	includeHidden?: boolean = false;

	/** Matching names have a type (e.g., MX.vernacularName, MX.hasMisappliedName). Multiple values are separated by a comma (,) */
	includeNameTypes?: string;

	/** Filter based on language of the matching name. Multiple values are separated by a comma (,) */
	includeLanguages?: string;

	/** Exclude taxa from specified informal taxon group(s). Multiple values are separated by a comma (,) */
	excludedInformalTaxonGroup?: string;

	/** Default: All match types; exact = exact matches, partial = partially matching, likely = fuzzy matching. Multiple values are separated by a comma (,) */
	matchType?: string;

	/** Matching names have a type (e.g., MX.vernacularName, MX.hasMisappliedName). Multiple values are separated by a comma (,) */
	excludeNameTypes?: string;

	/** Filter to include only species (and subspecies) */
	onlySpecies?: boolean = false;

	/** Filter to include only Finnish taxa */
	onlyFinnish?: boolean = false;

	/** Filter to include only invasive species */
	onlyInvasive?: boolean = false;

	/** If observationMode is set, "sp." is catenated to higher tax scientific names */
	observationMode?: boolean = false;

	/** Multiple values are separated by a comma (,) */
	selectedFields?: string;
}
