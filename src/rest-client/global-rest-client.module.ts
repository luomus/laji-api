import { HttpService } from "@nestjs/axios";
import { FactoryProvider, Global, Module } from "@nestjs/common";
import { GLOBAL_CLIENT } from "src/provider-tokens";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { RestClientService } from "src/rest-client/rest-client.service";

const GlobalRestClient: FactoryProvider<RestClientService<never>> = {
	provide: GLOBAL_CLIENT,
	useFactory: (httpService: HttpService, cache: RedisCacheService) =>
		new RestClientService(httpService, {
			name: "global",
			cache: true
		}, cache),
	inject: [HttpService, RedisCacheService],
};

@Global()
@Module({
	providers: [GlobalRestClient],
	exports: [GlobalRestClient]
})
export class GlobalRestClientModule {}
