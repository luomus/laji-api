import { Module } from "@nestjs/common";
import { ImagesController } from "./images.controller";
import { AbstractMediaService } from "src/abstract-media/abstract-media.service";
import { MediaClient } from "src/audio/audio.module";
import { MediaType } from "src/abstract-media/abstract-media.dto";
import { MEDIA_CONFIG } from "src/provider-tokens";
import { TriplestoreModule } from "src/triplestore/triplestore.module";

@Module({
	imports: [TriplestoreModule],
	controllers: [ImagesController],
	providers: [
		MediaClient,
		{ provide: MEDIA_CONFIG, useValue: {
			mediaClass: "IMAGE" as const,
			apiPath: "images" as const,
			type: MediaType.image
		} },
		AbstractMediaService
	]
})
export class ImagesModule {}
