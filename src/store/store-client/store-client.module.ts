import { HttpModule, HttpService } from "@nestjs/axios";
import { FactoryProvider, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";

const storeClientConfigProvider: FactoryProvider<RestClientConfig> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("STORE_PATH") as string,
		auth: configService.get("STORE_AUTH") as string,
	}),
	inject: [ConfigService],
};

const storeRestClientProvider: FactoryProvider<RestClientService> = {
	provide: "STORE_REST_CLIENT",
	useFactory: (httpService: HttpService, storeClientConfig: RestClientConfig) =>
		new RestClientService(httpService, storeClientConfig),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }],
};

@Module({
	imports: [HttpModule],
	providers: [storeClientConfigProvider, storeRestClientProvider],
	exports: [storeRestClientProvider]
})
export class StoreClientModule {
}
