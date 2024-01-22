import { MultiLang } from "../common.dto";
import { Image as ImageI } from "@luomus/laji-schema";
import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { mediaIntellectualRightsValues } from "../abstract-media/abstract-media.dto";

@Exclude()
export class Image implements ImageI {
	@Expose() caption?: string;
	@Expose() captureDateTime?: string;
	@Expose() capturerVerbatim?: string[];
	@ApiHideProperty() documentURI?: string[];
	@Expose() fullURL: string;
	@Expose() id?: string;
	@Expose() intellectualOwner: string;

	@ApiProperty({ enum: mediaIntellectualRightsValues })
	@Expose()
	intellectualRights: ImageI["intellectualRights"];

	@Expose() keyword?: string[];
	@Expose() largeURL: string;
	@ApiHideProperty() lifeStage?: ImageI["lifeStage"];
	@ApiHideProperty() originalFilename?: string;
	@Expose() originalURL?: string;
	@ApiHideProperty() plantLifeStage?: ImageI["plantLifeStage"];
	@ApiHideProperty() primaryForTaxon?: string[];
	@ApiHideProperty() publicityRestrictions?: ImageI["publicityRestrictions"];
	@ApiHideProperty() sex?: ImageI["sex"];
	@ApiHideProperty() sortOrder?: number;
	@ApiHideProperty() sourceSystem: string;
	@Expose() squareThumbnailURL: string;
	@ApiHideProperty() taxonDescriptionCaption?: MultiLang;
	@ApiHideProperty() taxonURI?: string[];
	@ApiHideProperty() taxonVerbatim?: string[];
	@Expose() thumbnailURL: string;
	@ApiHideProperty() type?: ImageI["type"];
	@ApiHideProperty() uploadDateTime?: string;
	@Expose() uploadedBy?: string;
}
