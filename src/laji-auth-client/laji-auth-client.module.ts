import { HttpService } from "@nestjs/axios";
import { FactoryProvider, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RestClientService } from "src/rest-client/rest-client.service";
import { LajiAuthClientService } from "./laji-auth-client.service";
import { LAJI_AUTH_CLIENT } from "src/provider-tokens";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

const lajiAuthClient: FactoryProvider<RestClientService<never>> = {
	provide: LAJI_AUTH_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService, cache: RedisCacheService) =>
		new RestClientService(httpService, {
			name: "laji-auth-client",
			host: config.get<string>("LAJI_AUTH_HOST")
		}, cache),
	inject: [HttpService, ConfigService, RedisCacheService],
};

@Module({
	providers: [LajiAuthClientService, lajiAuthClient],
	exports: [lajiAuthClient]
})
export class LajiAuthClientModule {}
