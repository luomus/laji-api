import { HttpException, Injectable } from "@nestjs/common";
import { AbstractAutocompleteService } from "./abstract-autocomplete.service";
import { TaxaService } from "src/taxa/taxa.service";
import { TaxaSearchDto, Taxon } from "src/taxa/taxa.dto";
import { TripReportUnitShorthandResponseDto } from "./autocomplete.dto";

type Interpretation = {
	taxonName: string;
	count: string;
	maleIndividualCount: string;
	femaleIndividualCount: string;
}

@Injectable()
export class TripReportUnitShorthandAutocompleteService
implements AbstractAutocompleteService<Omit<TaxaSearchDto, "query">> {
	constructor(private taxaService: TaxaService) {}

	async autocomplete(query: string, params: Omit<TaxaSearchDto, "query">) {
		query = query.trim();

		const matches = /^(\d+ )?((?:\D| )+ ?)(\d+ ?)?(\d+)?$/.exec(query);

		if (!matches) {
			throw new HttpException("Invalid \"query\" query param for trip report short hand value", 422);
		}
		const [_, count, taxonName, maleIndividualCount, femaleIndividualCount] = matches
			.map(s =>
				typeof s === "string"
					? s.trim() !== ""
						? s.trim()
						: undefined
					: undefined
			);
		const interpretation = { taxonName, count, maleIndividualCount, femaleIndividualCount } as Interpretation;

		let exactMatchFound = false;

		const results = taxonName
			? (await this.taxaService.search({ ...params, query: taxonName })).map(taxon => {
				if (taxon.type === "exactMatches") {
					exactMatchFound = true;
				}
				return mapTaxonToAutocompleteResult(taxon, interpretation);
			})
			: [];

		if (!exactMatchFound) {
			results.push({
				...mapTaxonToAutocompleteResult(undefined, interpretation)
			});
		}

		return results;
	}
}

const mapTaxonToAutocompleteResult = (
	taxon: Taxon | undefined,
	{ taxonName, count, maleIndividualCount, femaleIndividualCount }: Interpretation
): TripReportUnitShorthandResponseDto => ({
	key: taxon ? taxon.id : taxonName ?? "",
	value: [
		count,
		taxon ? taxon.matchingName : taxonName,
		maleIndividualCount,
		femaleIndividualCount
	].map(s => typeof s === "string" ? s.trim() : s)
		.filter(s => typeof s === "string" && s.length).join(" "),
	unit: {
		identifications: [ { taxon: taxon ? taxon.matchingName : taxonName } ],
		unitFact: taxon ? { autocompleteSelectedTaxonID: taxon.id } : {},
		count,
		maleIndividualCount: maleIndividualCount !== "" && !isNaN(+maleIndividualCount)
			? +maleIndividualCount
			: undefined,
		femaleIndividualCount: femaleIndividualCount !== "" && !isNaN(+femaleIndividualCount)
			? +femaleIndividualCount
			: undefined
	},
	...taxon,
	interpretedFrom: {
		taxon: taxonName,
		count,
		maleIndividualCount,
		femaleIndividualCount
	},
	isNonMatching: !taxon,
	matchType: taxon?.type
});
