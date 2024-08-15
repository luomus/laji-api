import { InformalTaxonGroup } from "@luomus/laji-schema/models";

export type Taxon = {
	vernacularName?: string;
	informalGroups?: (InformalTaxonGroup & { id: NonNullable<InformalTaxonGroup["id"]> })[];
};
