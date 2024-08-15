import { DocumentValidator, ValidationException } from "../document-validator.utils";
import { Document } from "@luomus/laji-schema";
import { TaxaService } from "src/taxa/taxa.service";
import { Injectable } from "@nestjs/common";

interface DocumentTaxon {
  taxonId: string;
  path: string;
}

@Injectable()
export class TaxonBelongsToInformalTaxonGroupValidatorService implements DocumentValidator {

	constructor(private taxaService: TaxaService) {}

	async validate(
		document: Document,
		path: string,
		{ informalTaxonGroup }: { informalTaxonGroup: string[] }
	) {
		await this.validateTaxa(this.getDocumentTaxa(document), informalTaxonGroup);
	}

	private validateTaxa(documentTaxa: DocumentTaxon[], informalTaxonGroups: string[]) {
		return Promise.all(documentTaxa.map(documentTaxon =>
			this.validateDocumentTaxon(documentTaxon, informalTaxonGroups))
		);
	}

	private getDocumentTaxa(document: Document): DocumentTaxon[] {
		const { gatherings } = document;

		return (gatherings || []).reduce((documentTaxa, gathering, gatheringIdx) => {
			if (gathering.skipped) {
				return documentTaxa;
			}
			(gathering.units || []).forEach((unit, unitIdx) => {
				const taxonId = unit.unitFact?.autocompleteSelectedTaxonID;
				if (taxonId) {
					documentTaxa.push({
						path: getPath(gatheringIdx, unitIdx),
						taxonId
					});
				}
			});
			return documentTaxa;
		}, [] as DocumentTaxon[]);
	}

	private async validateDocumentTaxon(documentTaxon: DocumentTaxon, informalTaxonGroups: string[]) {
		const taxon = await this.taxaService.get(documentTaxon.taxonId, "informalTaxonGroups");
		if (
			!taxon.informalGroups
			|| !taxon.informalGroups.some(({ id }) => informalTaxonGroups.includes(id))
		) {
			throw new ValidationException({
				[documentTaxon.path]: ["Taxon does not belong to given informal taxon groups."]
			});
		}
	}
}

function getPath(gatheringIdx: number, unitIdx: number) {
	return `/gatherings/${gatheringIdx}/units/${unitIdx}/unitFact/autocompleteSelectedTaxonID`;
}
