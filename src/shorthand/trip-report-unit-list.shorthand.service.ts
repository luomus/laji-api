import { Injectable } from "@nestjs/common";
import { AbstractShorthandService } from "./abstract-shorthand.service";
import { TaxaService } from "src/taxa/taxa.service";
import { Taxon } from "src/taxa/taxa.dto";
import { Unit } from "@luomus/laji-schema/classes";
import { TripReportUnitListResultDto } from "./shorthand.dto";

@Injectable()
export class TripReportUnitListShorthandService implements AbstractShorthandService<undefined> {
	constructor(private taxaService: TaxaService) {}

	async shorthand(query?: string) {
		const result: TripReportUnitListResultDto = { count: 0, nonMatchingCount: 0, results: [] };
		const searchNames = (query || "").split(",").map(s => s.trim()).filter(s => s.length !== 0);
		for (const searchName of searchNames) {
			const [taxon] = await this.taxaService.search({ query: searchName });
			const unit = mapTaxon(taxon, searchName);
			result.count++;
			if (!taxon) {
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
