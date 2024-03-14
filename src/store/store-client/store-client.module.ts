import { HttpService } from "@nestjs/axios";
import { FactoryProvider, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { RestClientService } from "src/rest-client/rest-client.service";

export const STORE_CLIENT = "STORE_CLIENT";

const StoreRestClient: FactoryProvider<RestClientService<never>> = {
	provide: STORE_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService, cache: RedisCacheService) =>
		new RestClientService(httpService, {
			name: "store",
			host: config.get<string>("STORE_HOST"),
			auth: config.get<string>("STORE_AUTH"),
		}, cache),
	inject: [HttpService, ConfigService, RedisCacheService],
};

@Module({
	providers: [StoreRestClient],
	exports: [StoreRestClient]
})
export class StoreClientModule {
}
