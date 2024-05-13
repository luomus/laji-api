import { Module, forwardRef } from "@nestjs/common";
import { DocumentValidatorService } from "./document-validator.service";
import { FormsModule } from "src/forms/forms.module";
import { TaxonBelongsToInformalTaxonGroupService } from "./validators/taxon-belongs-to-informal-taxon-group.service";
import { NoExistingGatheringsInNamedPlaceService } from "./validators/no-existing-gatherings-in-named-place.service";
import { TaxaModule } from "src/taxa/taxa.module";
import { DocumentsModule } from "../documents.module";
import { NamedPlacesModule } from "src/named-places/named-places.module";
import { NamedPlaceNotTooNearOtherPlacesService } from "./validators/named-place-not-too-near-other-places.service";

@Module({
	providers: [
		DocumentValidatorService,
		TaxonBelongsToInformalTaxonGroupService,
		NoExistingGatheringsInNamedPlaceService,
		NamedPlaceNotTooNearOtherPlacesService
	],
	imports: [FormsModule, TaxaModule, forwardRef(() => DocumentsModule), forwardRef(() => NamedPlacesModule)],
	exports: [DocumentValidatorService]
})
export class DocumentValidatorModule {}
