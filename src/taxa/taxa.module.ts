import { FactoryProvider, Module } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { TaxaService } from "./taxa.service";

const TaxaRestClient: FactoryProvider<RestClientService<never>> = {
	provide: "TAXA_REST_CLIENT",
	useFactory: (httpService: HttpService, config: ConfigService) =>
		new RestClientService(httpService, {
			name: "taxon",
			host: config.get<string>("TAXON_HOST"),
			auth: config.get<string>("TAXON_AUTH"),
		}),
	inject: [HttpService, ConfigService],
};

@Module({
	providers: [TaxaService, TaxaRestClient],
	exports: [TaxaService]
})
export class TaxaModule {}
