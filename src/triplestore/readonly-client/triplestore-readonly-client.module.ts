import { HttpModule, HttpService } from "@nestjs/axios";
import { CACHE_MANAGER } from "@nestjs/common";
import { FactoryProvider, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";
import { Cache } from "cache-manager";

const triplestoreClientConfigProvider: FactoryProvider<RestClientConfig> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("TRIPLESTORE_READONLY_PATH") as string,
		auth: configService.get("TRIPLESTORE_READONLY_AUTH") as string,
	}),
	inject: [ConfigService],
};

export const triplestoreRestClientProvider: FactoryProvider<RestClientService> = {
	provide: "TRIPLESTORE_READONLY_REST_CLIENT",
	useFactory: (httpService: HttpService, storeClientConfig: RestClientConfig, cache: Cache) =>
		new RestClientService(httpService, storeClientConfig, cache),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }, { token: CACHE_MANAGER, optional: false }],
};

@Module({
	imports: [HttpModule],
	providers: [triplestoreClientConfigProvider, triplestoreRestClientProvider],
	exports: [triplestoreRestClientProvider]
})
export class TriplestoreReadonlyClientModule {}
