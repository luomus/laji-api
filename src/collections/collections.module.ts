import { CACHE_MANAGER, FactoryProvider, Module } from "@nestjs/common";
import { CollectionsService } from "./collections.service";
import { CollectionsController } from "./collections.controller";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";
import { HttpModule, HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { Cache } from "cache-manager";
import { TriplestoreModule } from "src/triplestore/triplestore.module";
import { LangModule } from "src/lang/lang.module";

const gbifClientConfigProvider: FactoryProvider<RestClientConfig> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("GBIF_PATH") as string,
	}),
	inject: [ConfigService],
};

const gbifRestClientProvider: FactoryProvider<RestClientService> = {
	provide: "GBIF_REST_CLIENT",
	useFactory: (httpService: HttpService, gbifClientConfig: RestClientConfig, cache: Cache) =>
		new RestClientService(httpService, gbifClientConfig, cache),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }, { token: CACHE_MANAGER, optional: false }],
};

@Module({
	imports: [HttpModule, TriplestoreModule, LangModule],
	controllers: [CollectionsController],
	providers: [CollectionsService, gbifRestClientProvider, gbifClientConfigProvider],
	exports: [CollectionsService]
})
export class CollectionsModule {}
