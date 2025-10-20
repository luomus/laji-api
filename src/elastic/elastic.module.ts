import { HttpService } from "@nestjs/axios";
import { FactoryProvider, Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ELASTIC_CLIENT } from "src/provider-tokens";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ElasticService } from "./elastic.service";

const ElasticRestClient: FactoryProvider<RestClientService<never>> = {
	provide: ELASTIC_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService) =>
		new RestClientService(httpService, {
			name: "elastic",
			host: config.get<string>("ELASTIC_HOST"),
			auth: config.get<string>("ELASTIC_AUTH")
		}),
	inject: [HttpService, ConfigService],
};

@Global()
@Module({
	providers: [ElasticRestClient, ElasticService],
	exports: [ElasticService]
})
export class ElasticModule {}
