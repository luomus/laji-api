import { HasContext } from '../common.dto';
import { Audio as AudioI } from '@luomus/laji-schema';
import { Private } from '../serializing/private.decorator';

export class Audio extends HasContext implements AudioI {
    caption: string;
    captureDateTime: string;
    capturerVerbatim: string[];
    @Private() documentURI: string[];
    fullURL: string;
    id: string;
    intellectualOwner: string;
    intellectualRights: "MZ.intellectualRightsCC-BY-SA-4.0" | "MZ.intellectualRightsCC-BY-NC-4.0" | "MZ.intellectualRightsCC-BY-NC-SA-4.0" | "MZ.intellectualRightsCC-BY-4.0" | "MZ.intellectualRightsCC0-4.0" | "MZ.intellectualRightsODBL-1.0" | "MZ.intellectualRightsPD" | "MZ.intellectualRightsARR" | "MZ.intellectualRightsCC-BY-2.0" | "MZ.intellectualRightsCC-BY-SA-2.0" | "MZ.intellectualRightsCC-BY-SA-2.0-DE" | "MZ.intellectualRightsCC-BY-NC-2.0" | "MZ.intellectualRightsCC-BY-NC-SA-2.0" | "MZ.intellectualRightsCC-BY-NC-ND-2.0" | "MZ.intellectualRightsCC-BY-SA-2.5" | "MZ.intellectualRightsCC-BY-SA-2.5-SE" | "MZ.intellectualRightsCC-BY-3.0" | "MZ.intellectualRightsCC-BY-SA-3.0" | "MZ.intellectualRightsCC-BY-NC-SA-3.0" | "MZ.intellectualRightsCC-BY-ND-4.0" | "MZ.intellectualRightsCC-BY-NC-ND-4.0";
    keyword: string[];
    @Private() lifeStage: "" | "MY.lifeStageEgg" | "MY.lifeStageLarva" | "MY.lifeStagePupa" | "MY.lifeStageJuvenile" | "MY.lifeStageNymph" | "MY.lifeStageSubimago" | "MY.lifeStageImmature" | "MY.lifeStageAdult" | "MY.lifeStageFertile" | "MY.lifeStageSterile" | "MY.lifeStageTadpole" | "MY.lifeStageEmbryo" | "MY.lifeStageSubadult" | "MY.lifeStageMature" | "MY.lifeStagePullus" | "MY.lifeStageHatchedEgg" | "MY.lifeStageHatchedPupa" | "MY.lifeStageGall" | "MY.lifeStageMarks" | "MY.lifeStageTriungulin";
    mp3URL: string;
    @Private() originalFilename: string;
    @Private() plantLifeStage: "" | "MY.plantLifeStageSterile" | "MY.plantLifeStageFertile" | "MY.plantLifeStageSeed" | "MY.plantLifeStageSprout" | "MY.plantLifeStageBud" | "MY.plantLifeStageFlower" | "MY.plantLifeStageWitheredFlower" | "MY.plantLifeStageRipeningFruit" | "MY.plantLifeStageRipeFruit" | "MY.plantLifeStageDeadSprout" | "MY.plantLifeStageSubterranean";
    @Private() primaryForTaxon: string[];
    @Private() publicityRestrictions: "" | "MZ.publicityRestrictionsPublic" | "MZ.publicityRestrictionsProtected" | "MZ.publicityRestrictionsPrivate";
    @Private() sex: "" | "MY.sexM" | "MY.sexF" | "MY.sexW" | "MY.sexU" | "MY.sexN" | "MY.sexX" | "MY.sexE" | "MY.sexC";
    @Private() sortOrder: number;
    @Private() sourceSystem: string;
    @Private() taxonDescriptionCaption: { en?: string; fi?: string; sv?: string };
    @Private() taxonURI: string[];
    @Private() taxonVerbatim: string[];
    thumbnailURL: string;
    @Private() type: "" | "MM.typeEnumLive" | "MM.typeEnumSpecimen" | "MM.typeEnumGenitalia" | "MM.typeEnumMicroscopy" | "MM.typeEnumCarcass" | "MM.typeEnumHabitat" | "MM.typeEnumLabel";
    @Private() uploadDateTime: string;
    uploadedBy: string;
    wavURL: string;
}
