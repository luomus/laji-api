import { Injectable } from "@nestjs/common";
import { AbstractAutocompleteService } from "./abstract-autocomplete.service";
import { TaxaService } from "src/taxa/taxa.service";
import { Taxon } from "src/taxa/taxa.dto";
import { Unit } from "@luomus/laji-schema/classes";
import { TripReportUnitListResultDto } from "./autocomplete.dto";

@Injectable()
export class TripReportUnitListAutocompleteService implements AbstractAutocompleteService<undefined> {
	constructor(private taxaService: TaxaService) {}

	async autocomplete(query?: string) {
		const result: TripReportUnitListResultDto = { count: 0, nonMatchingCount: 0, results: [] };
		const searchNames = (query || "").split(",").map(s => s.trim()).filter(s => s.length !== 0);
		for (const searchName of searchNames) {
			const [taxon] = await this.taxaService.search({ query: searchName });
			const unit = mapTaxon(taxon, searchName);
			if (taxon) {
				result.count++;
			} else {
				result.nonMatchingCount++;
			}
			result.results.push(unit);
		}
		return result;
	}
}

const mapTaxon = (taxon: Taxon | undefined, searchName: string): Unit => taxon
	? {
		informalTaxonGroups: taxon.informalGroups?.map(g => g.id),
		identifications: [{ taxon: taxon.matchingName }],
		unitFact: { autocompleteSelectedTaxonID: taxon.id }
	}
	: {
		informalTaxonGroups: [],
		identifications: [{ taxon: searchName }],
		unitFact: {}
	};
