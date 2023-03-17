import { HttpModule, HttpService } from "@nestjs/axios";
import { FactoryProvider, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";
import { TriplestoreService } from "./triplestore.service";

const triplestoreClientConfigProvider: FactoryProvider<RestClientConfig> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("TRIPLESTORE_PATH") as string,
		auth: configService.get("TRIPLESTORE_AUTH") as string,
	}),
	inject: [ConfigService],
};

const triplestoreRestClientProvider: FactoryProvider<RestClientService> = {
	provide: "TRIPLESTORE_REST_CLIENT",
	useFactory: (httpService: HttpService, storeClientConfig: RestClientConfig) =>
		new RestClientService(httpService, storeClientConfig),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }],
};

@Module({
	imports: [HttpModule],
	providers: [triplestoreClientConfigProvider, triplestoreRestClientProvider, TriplestoreService],
	exports: [TriplestoreService]
})
export class TriplestoreModule {}
