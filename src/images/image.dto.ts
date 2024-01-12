import { MultiLang } from "../common.dto";
import { Image as ImageI } from "@luomus/laji-schema";
import { ApiHideProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";

@Exclude()
export class Image implements ImageI {
    @Expose() caption?: string;
    @Expose() captureDateTime?: string;
    @Expose() capturerVerbatim?: string[];
    @ApiHideProperty() documentURI?: string[];
    @Expose() fullURL: string;
    @Expose() id?: string;
    @Expose() intellectualOwner: string;
    @Expose() intellectualRights:
        "MZ.intellectualRightsCC-BY-SA-4.0" |
        "MZ.intellectualRightsCC-BY-NC-4.0" |
        "MZ.intellectualRightsCC-BY-NC-SA-4.0" |
        "MZ.intellectualRightsCC-BY-4.0" |
        "MZ.intellectualRightsCC0-4.0" |
        "MZ.intellectualRightsODBL-1.0" |
        "MZ.intellectualRightsPD" |
        "MZ.intellectualRightsARR" |
        "MZ.intellectualRightsCC-BY-2.0" |
        "MZ.intellectualRightsCC-BY-SA-2.0" |
        "MZ.intellectualRightsCC-BY-SA-2.0-DE" |
        "MZ.intellectualRightsCC-BY-NC-2.0" |
        "MZ.intellectualRightsCC-BY-NC-SA-2.0" |
        "MZ.intellectualRightsCC-BY-NC-ND-2.0" |
        "MZ.intellectualRightsCC-BY-SA-2.5" |
        "MZ.intellectualRightsCC-BY-SA-2.5-SE" |
        "MZ.intellectualRightsCC-BY-3.0" |
        "MZ.intellectualRightsCC-BY-SA-3.0" |
        "MZ.intellectualRightsCC-BY-NC-SA-3.0" |
        "MZ.intellectualRightsCC-BY-ND-4.0" |
        "MZ.intellectualRightsCC-BY-NC-ND-4.0";
    @Expose() keyword?: string[];
    @Expose() largeURL: string;
    @ApiHideProperty() lifeStage?:
        "" |
        "MY.lifeStageEgg" |
        "MY.lifeStageLarva" |
        "MY.lifeStagePupa" |
        "MY.lifeStageJuvenile" |
        "MY.lifeStageNymph" |
        "MY.lifeStageSubimago" |
        "MY.lifeStageImmature" |
        "MY.lifeStageAdult" |
        "MY.lifeStageFertile" |
        "MY.lifeStageSterile" |
        "MY.lifeStageTadpole" |
        "MY.lifeStageEmbryo" |
        "MY.lifeStageSubadult" |
        "MY.lifeStageMature" |
        "MY.lifeStagePullus" |
        "MY.lifeStageHatchedEgg" |
        "MY.lifeStageHatchedPupa" |
        "MY.lifeStageGall" |
        "MY.lifeStageMarks" |
        "MY.lifeStageTriungulin";
    @ApiHideProperty() originalFilename?: string;
    @Expose() originalURL?: string;
    @ApiHideProperty() plantLifeStage?:
        "" |
        "MY.plantLifeStageSterile" |
        "MY.plantLifeStageFertile" |
        "MY.plantLifeStageSeed" |
        "MY.plantLifeStageSprout" |
        "MY.plantLifeStageBud" |
        "MY.plantLifeStageFlower" |
        "MY.plantLifeStageWitheredFlower" |
        "MY.plantLifeStageRipeningFruit" |
        "MY.plantLifeStageRipeFruit" |
        "MY.plantLifeStageDeadSprout" |
        "MY.plantLifeStageSubterranean";
    @ApiHideProperty() primaryForTaxon?: string[];
    @ApiHideProperty() publicityRestrictions?:
        "" |
        "MZ.publicityRestrictionsPublic" |
        "MZ.publicityRestrictionsProtected" |
        "MZ.publicityRestrictionsPrivate";
    @ApiHideProperty() sex?:
        "" |
        "MY.sexM" |
        "MY.sexF" |
        "MY.sexW" |
        "MY.sexU" |
        "MY.sexN" |
        "MY.sexX" |
        "MY.sexE" |
        "MY.sexC";
    @ApiHideProperty() sortOrder?: number;
    @ApiHideProperty() sourceSystem: string;
    @Expose() squareThumbnailURL: string;
    @ApiHideProperty() taxonDescriptionCaption?: MultiLang;
    @ApiHideProperty() taxonURI?: string[];
    @ApiHideProperty() taxonVerbatim?: string[];
    @Expose() thumbnailURL: string;
    @ApiHideProperty() type?:
        "" |
        "MM.typeEnumLive" |
        "MM.typeEnumSpecimen" |
        "MM.typeEnumGenitalia" |
        "MM.typeEnumMicroscopy" |
        "MM.typeEnumCarcass" |
        "MM.typeEnumHabitat" |
        "MM.typeEnumLabel";
    @ApiHideProperty() uploadDateTime?: string;
    @Expose() uploadedBy?: string;
}
