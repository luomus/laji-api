import { FactoryProvider, Module } from "@nestjs/common";
import { AudioController } from "./audio.controller";
import { MEDIA_CLIENT, MEDIA_CONFIG } from "src/provider-tokens";
import { AbstractMediaService } from "src/abstract-media/abstract-media.service";
import { RestClientService } from "src/rest-client/rest-client.service";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { MediaType } from "src/abstract-media/abstract-media.dto";
import { TriplestoreModule } from "src/triplestore/triplestore.module";

export const MediaClient: FactoryProvider<RestClientService> = {
	provide: MEDIA_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService) =>
		new RestClientService(httpService, {
			name: "media",
			host: config.get<string>("MEDIA_HOST"),
			auth: config.get<string>("MEDIA_AUTH"),
		}),
	inject: [HttpService, ConfigService],
};

@Module({
	imports: [TriplestoreModule],
	controllers: [AudioController],
	providers: [
		MediaClient,
		{ provide: MEDIA_CONFIG, useValue: {
			mediaClass: "AUDIO" as const,
			apiPath: "audio" as const,
			type: MediaType.audio
		} },
		AbstractMediaService
	]
})
export class AudioModule {}
