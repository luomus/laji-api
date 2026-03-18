import { MultiLang } from "../common.dto";
import { Audio as AudioI } from "@luomus/laji-schema";
import { ApiHideProperty, ApiProperty, IntersectionType, OmitType } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { mediaIntellectualRightsValues } from "../abstract-media/abstract-media.dto";
import { PaginatedDto } from "src/pagination.dto";

@Exclude()
export class Audio implements AudioI {
	@Expose() caption?: string;
	@Expose() captureDateTime?: string;
	@Expose() capturerVerbatim?: string[];
	@ApiHideProperty() documentURI?: string[];
	@Expose() flacURL?: string;
	@Expose() fullURL: string;
	@Expose() id?: string;
	@Expose() intellectualOwner: string;

	@ApiProperty({ enum: mediaIntellectualRightsValues })
	@Expose()
	intellectualRights: AudioI["intellectualRights"];

	@Expose() keyword?: string[];
	@ApiHideProperty() lifeStage?: AudioI["lifeStage"];
	@Expose() mp3URL: string;
	@ApiHideProperty() originalFilename?: string;
	@ApiHideProperty() plantLifeStage?: AudioI["plantLifeStage"];
	@ApiHideProperty() primaryForTaxon?: string[];
	@ApiHideProperty() publicityRestrictions?: AudioI["publicityRestrictions"];
	@ApiHideProperty() sex?: AudioI["sex"];
	@ApiHideProperty() sortOrder?: number;
	@ApiHideProperty() sourceSystem: string;
	@ApiHideProperty() taxonDescriptionCaption?: MultiLang;
	@ApiHideProperty() taxonURI?: string[];
	@ApiHideProperty() taxonVerbatim?: string[];
	@Expose() thumbnailURL: string;
	@ApiHideProperty() type?: AudioI["type"];
	@ApiHideProperty() uploadDateTime?: string;
	@Expose() uploadedBy?: string;
	@Expose() wavURL?: string;
}

export class AudioPagedDto extends IntersectionType(OmitType(PaginatedDto, ["results"])) {
	results: Audio[];
}
