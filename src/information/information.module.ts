import { FactoryProvider, Module } from "@nestjs/common";
import { InformationController } from "./information.controller";
import { InformationService } from "./information.service";
import { INFORMATION_CLIENT } from "src/provider-tokens";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { RestClientService } from "src/rest-client/rest-client.service";
import { CACHE_1_MIN } from "src/utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

const InformationRestClient: FactoryProvider<RestClientService<never>> = {
	provide: INFORMATION_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService, cache: RedisCacheService) =>
		new RestClientService(httpService, {
			name: "information",
			host: config.get<string>("LAJI_BACKEND_HOST") + "/CMS",
			cache: CACHE_1_MIN
		}, cache),
	inject: [HttpService, ConfigService, RedisCacheService],
};

@Module({
	controllers: [InformationController],
	providers: [InformationService, InformationRestClient]
})
export class InformationModule {}
