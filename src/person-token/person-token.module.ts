import { FactoryProvider, Module } from "@nestjs/common";
import { PersonTokenService } from "./person-token.service";
import { ConfigService } from "@nestjs/config";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";
import { Person } from "src/persons/person.dto";
import { HttpModule, HttpService } from "@nestjs/axios";
import { PersonTokenController } from "./person-token.controller";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/common";

const lajiAuthClientConfigProvider: FactoryProvider<RestClientConfig> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("LAJI_AUTH_PATH") as string
	}),
	inject: [ConfigService],
};

const lajiAuthRestClientProvider: FactoryProvider<RestClientService<Person>> = {
	provide: "LAJI_AUTH_REST_CLIENT",
	useFactory: (httpService: HttpService, lajiAuthClientConfig: RestClientConfig, cache: Cache) =>
		new RestClientService(httpService, lajiAuthClientConfig, cache),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }, { token: CACHE_MANAGER, optional: false }],
};


@Module({
	imports: [HttpModule],
	providers: [PersonTokenService, lajiAuthRestClientProvider, lajiAuthClientConfigProvider],
	exports: [PersonTokenService],
	controllers: [PersonTokenController]
})
export class PersonTokenModule {}
