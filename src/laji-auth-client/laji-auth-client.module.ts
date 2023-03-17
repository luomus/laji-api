import { HttpModule, HttpService } from "@nestjs/axios";
import { FactoryProvider, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";
import { LajiAuthClientService } from "./laji-auth-client.service";

const lajiAuthClientConfigProvider: FactoryProvider<RestClientConfig> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("LAJI_AUTH_PATH") as string
	}),
	inject: [ConfigService],
};

const lajiAuthRestClientProvider: FactoryProvider<RestClientService<any>> = {
	provide: "LAJI_AUTH_REST_CLIENT",
	useFactory: (httpService: HttpService, lajiAuthClientConfig: RestClientConfig) =>
		new RestClientService(httpService, lajiAuthClientConfig),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }],
};

@Module({
	imports: [HttpModule],
	providers: [LajiAuthClientService, lajiAuthRestClientProvider, lajiAuthClientConfigProvider]
})
export class LajiAuthClientModule {}
