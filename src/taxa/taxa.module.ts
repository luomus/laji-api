import { FactoryProvider, Module } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { TaxaService } from "./taxa.service";
import { TAXA_CLIENT, TAXA_ELASTIC_CLIENT } from "src/provider-tokens";
import { TaxaController } from "./taxa.controller";
import { SwaggerModule } from "@nestjs/swagger";

const TaxaRestClient: FactoryProvider<RestClientService<never>> = {
	provide: TAXA_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService) =>
		new RestClientService(httpService, {
			name: "taxon",
			host: config.get<string>("LAJI_BACKEND_HOST") + "/taxon-search"
		}),
	inject: [HttpService, ConfigService],
};

const TaxaElasticRestClient: FactoryProvider<RestClientService<never>> = {
	provide: TAXA_ELASTIC_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService) =>
		new RestClientService(httpService, {
			name: "taxon-elastic",
			host: config.get<string>("ELASTIC_HOST"),
			auth: config.get<string>("ELASTIC_AUTH")
		}),
	inject: [HttpService, ConfigService],
};

@Module({
	imports: [SwaggerModule],
	providers: [TaxaService, TaxaRestClient, TaxaElasticRestClient],
	exports: [TaxaService],
	controllers: [TaxaController]
})
export class TaxaModule {}
