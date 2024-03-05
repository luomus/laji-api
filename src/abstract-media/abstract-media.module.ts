import { FactoryProvider, Module } from "@nestjs/common";
import { AbstractMediaService } from "./abstract-media.service";
import { TriplestoreModule } from "../triplestore/triplestore.module";
import { RestClientConfig, RestClientService } from "../rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { HttpModule, HttpService } from "@nestjs/axios";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { PersonsModule } from "../persons/persons.module";

const mediaClientConfigProvider: FactoryProvider<RestClientConfig<never>> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("MEDIA_PATH") as string,
		auth: configService.get("MEDIA_AUTH") as string,
	}),
	inject: [ConfigService],
};

const mediaRestClientProvider: FactoryProvider<RestClientService> = {
	provide: "MEDIA_REST_CLIENT",
	useFactory: (httpService: HttpService, mediaClientConfig: RestClientConfig<never>, cache: Cache) =>
		new RestClientService(httpService, mediaClientConfig, cache),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }, { token: CACHE_MANAGER, optional: false }],
};

@Module({
	imports: [HttpModule, TriplestoreModule, PersonsModule],
	controllers: [],
	providers: [AbstractMediaService, mediaRestClientProvider, mediaClientConfigProvider],
	exports: [AbstractMediaService]
})
export class AbstractMediaModule {}
