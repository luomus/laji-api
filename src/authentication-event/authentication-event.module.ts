import { FactoryProvider, Module } from "@nestjs/common";
import { PersonTokenService } from "./authentication-event.service";
import { ConfigService } from "@nestjs/config";
import { RestClientService } from "src/rest-client/rest-client.service";
import { Person } from "src/persons/person.dto";
import { HttpService } from "@nestjs/axios";
import { PersonTokenController } from "./authentication-event.controller";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { LAJI_AUTH_CLIENT } from "src/provider-tokens";

const LajiAuthRestClient: FactoryProvider<RestClientService<Person>> = {
	provide: LAJI_AUTH_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService, cache: RedisCacheService) =>
		new RestClientService(httpService, {
			name: "laji-auth",
			host: config.get<string>("LAJI_AUTH_HOST")
		}, cache),
	inject: [HttpService, ConfigService, RedisCacheService],
};

@Module({
	providers: [PersonTokenService, LajiAuthRestClient],
	exports: [PersonTokenService],
	controllers: [PersonTokenController]
})
export class PersonTokenModule {}
