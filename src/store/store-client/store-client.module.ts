import { HttpModule, HttpService } from "@nestjs/axios";
import { FactoryProvider, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";

const storeClientConfigProvider: FactoryProvider<RestClientConfig<never>> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("STORE_PATH") as string,
		auth: configService.get("STORE_AUTH") as string,
	}),
	inject: [ConfigService],
};

const storeRestClientProvider: FactoryProvider<RestClientService<never>> = {
	provide: "STORE_REST_CLIENT",
	useFactory: (httpService: HttpService, storeClientConfig: RestClientConfig<never>, cache: RedisCacheService) =>
		new RestClientService(httpService, storeClientConfig, cache),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }, RedisCacheService],
};

@Module({
	imports: [HttpModule],
	providers: [storeClientConfigProvider, storeRestClientProvider],
	exports: [storeRestClientProvider]
})
export class StoreClientModule {
}
