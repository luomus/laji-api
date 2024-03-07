import { FactoryProvider, Module } from "@nestjs/common";
import { HttpModule, HttpService } from "@nestjs/axios";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { TaxaService } from "./taxa.service";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

const taxaClientConfigProvider: FactoryProvider<RestClientConfig<never>> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("TAXON_PATH") as string,
		auth: configService.get("TAXON_AUTH") as string,
	}),
	inject: [ConfigService],
};

const taxaRestClientProvider: FactoryProvider<RestClientService<never>> = {
	provide: "TAXA_REST_CLIENT",
	useFactory: (httpService: HttpService, formClientConfig: RestClientConfig<never>, cache: RedisCacheService) =>
		new RestClientService(httpService, formClientConfig, cache),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }, RedisCacheService],
};

@Module({
	imports: [HttpModule],
	providers: [TaxaService, taxaRestClientProvider, taxaClientConfigProvider],
	exports: [TaxaService]
})
export class TaxaModule {}
