import { MultiLang } from '../common.dto';
import { Image as ImageI } from '@luomus/laji-schema';
import { Private } from '../serializing/private.decorator';
import { ApiHideProperty } from '@nestjs/swagger'

export class Image implements ImageI {
    caption?: string;
    captureDateTime?: string;
    capturerVerbatim?: string[];
    @ApiHideProperty() @Private() documentURI?: string[];
    fullURL: string;
    id?: string;
    intellectualOwner: string;
    intellectualRights: "MZ.intellectualRightsCC-BY-SA-4.0" | "MZ.intellectualRightsCC-BY-NC-4.0" | "MZ.intellectualRightsCC-BY-NC-SA-4.0" | "MZ.intellectualRightsCC-BY-4.0" | "MZ.intellectualRightsCC0-4.0" | "MZ.intellectualRightsODBL-1.0" | "MZ.intellectualRightsPD" | "MZ.intellectualRightsARR" | "MZ.intellectualRightsCC-BY-2.0" | "MZ.intellectualRightsCC-BY-SA-2.0" | "MZ.intellectualRightsCC-BY-SA-2.0-DE" | "MZ.intellectualRightsCC-BY-NC-2.0" | "MZ.intellectualRightsCC-BY-NC-SA-2.0" | "MZ.intellectualRightsCC-BY-NC-ND-2.0" | "MZ.intellectualRightsCC-BY-SA-2.5" | "MZ.intellectualRightsCC-BY-SA-2.5-SE" | "MZ.intellectualRightsCC-BY-3.0" | "MZ.intellectualRightsCC-BY-SA-3.0" | "MZ.intellectualRightsCC-BY-NC-SA-3.0" | "MZ.intellectualRightsCC-BY-ND-4.0" | "MZ.intellectualRightsCC-BY-NC-ND-4.0";
    keyword?: string[];
    largeURL: string;
    @ApiHideProperty() @Private() lifeStage?: "" | "MY.lifeStageEgg" | "MY.lifeStageLarva" | "MY.lifeStagePupa" | "MY.lifeStageJuvenile" | "MY.lifeStageNymph" | "MY.lifeStageSubimago" | "MY.lifeStageImmature" | "MY.lifeStageAdult" | "MY.lifeStageFertile" | "MY.lifeStageSterile" | "MY.lifeStageTadpole" | "MY.lifeStageEmbryo" | "MY.lifeStageSubadult" | "MY.lifeStageMature" | "MY.lifeStagePullus" | "MY.lifeStageHatchedEgg" | "MY.lifeStageHatchedPupa" | "MY.lifeStageGall" | "MY.lifeStageMarks" | "MY.lifeStageTriungulin";
    @ApiHideProperty() @Private() originalFilename?: string;
    originalURL?: string;
    @ApiHideProperty() @Private() plantLifeStage?: "" | "MY.plantLifeStageSterile" | "MY.plantLifeStageFertile" | "MY.plantLifeStageSeed" | "MY.plantLifeStageSprout" | "MY.plantLifeStageBud" | "MY.plantLifeStageFlower" | "MY.plantLifeStageWitheredFlower" | "MY.plantLifeStageRipeningFruit" | "MY.plantLifeStageRipeFruit" | "MY.plantLifeStageDeadSprout" | "MY.plantLifeStageSubterranean";
    @ApiHideProperty() @Private() primaryForTaxon?: string[];
    @ApiHideProperty() @Private() publicityRestrictions?: "" | "MZ.publicityRestrictionsPublic" | "MZ.publicityRestrictionsProtected" | "MZ.publicityRestrictionsPrivate";
    @ApiHideProperty() @Private() sex?: "" | "MY.sexM" | "MY.sexF" | "MY.sexW" | "MY.sexU" | "MY.sexN" | "MY.sexX" | "MY.sexE" | "MY.sexC";
    @ApiHideProperty() @Private() sortOrder?: number;
    @ApiHideProperty() @Private() sourceSystem: string;
    squareThumbnailURL: string;
    @ApiHideProperty() @Private() taxonDescriptionCaption?: MultiLang;
    @ApiHideProperty() @Private() taxonURI?: string[];
    @ApiHideProperty() @Private() taxonVerbatim?: string[];
    thumbnailURL: string;
    @ApiHideProperty() @Private() type?: "" | "MM.typeEnumLive" | "MM.typeEnumSpecimen" | "MM.typeEnumGenitalia" | "MM.typeEnumMicroscopy" | "MM.typeEnumCarcass" | "MM.typeEnumHabitat" | "MM.typeEnumLabel";
    @ApiHideProperty() @Private() uploadDateTime?: string;
    uploadedBy?: string;
}
