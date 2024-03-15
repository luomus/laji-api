import { FactoryProvider, Module } from "@nestjs/common";
import { AbstractMediaService } from "./abstract-media.service";
import { TriplestoreModule } from "../triplestore/triplestore.module";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { PersonsModule } from "../persons/persons.module";
import { RestClientService } from "src/rest-client/rest-client.service";
import { MEDIA_CLIENT } from "src/provider-tokens";

const MediaRestClient: FactoryProvider<RestClientService> = {
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
	imports: [TriplestoreModule, PersonsModule],
	providers: [AbstractMediaService, MediaRestClient],
	exports: [AbstractMediaService]
})
export class AbstractMediaModule {}
