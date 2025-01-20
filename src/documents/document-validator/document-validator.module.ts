import { Module, forwardRef } from "@nestjs/common";
import { DocumentValidatorService } from "./document-validator.service";
import { FormsModule } from "src/forms/forms.module";
import { TaxaModule } from "src/taxa/taxa.module";
import { DocumentsModule } from "../documents.module";
import { NamedPlacesModule } from "src/named-places/named-places.module";
import { TaxonBelongsToInformalTaxonGroupValidatorService }
	from "./validators/taxon-belongs-to-informal-taxon-group.validator.service";
import { NoExistingGatheringsInNamedPlaceValidatorService }
	from "./validators/no-existing-gatherings-in-named-place.validator.service";
import { NamedPlaceNotTooNearOtherPlacesValidatorService }
	from "./validators/named-place-not-too-near-other-places.validator.service";
import { UniqueNamedPlaceAlternativeIDsValidatorService }
	from "./validators/unique-named-place-alternativeIDs.validator.service";
import { ProfileModule } from "src/profile/profile.module";
import { FormPermissionsModule } from "src/forms/form-permissions/form-permissions.module";
import { CollectionsModule } from "src/collections/collections.module";

@Module({
	providers: [
		DocumentValidatorService,
		TaxonBelongsToInformalTaxonGroupValidatorService,
		NoExistingGatheringsInNamedPlaceValidatorService,
		NamedPlaceNotTooNearOtherPlacesValidatorService,
		UniqueNamedPlaceAlternativeIDsValidatorService
	],
	imports: [
		FormsModule,
		TaxaModule,
		forwardRef(() => DocumentsModule),
		forwardRef(() => NamedPlacesModule),
		ProfileModule,
		FormPermissionsModule,
		CollectionsModule
	],
	exports: [DocumentValidatorService]
})
export class DocumentValidatorModule {}
