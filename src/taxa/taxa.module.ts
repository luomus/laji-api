import { FactoryProvider, Module } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { TaxaService } from "./taxa.service";
import { TAXA_CLIENT } from "src/provider-tokens";

const TaxaRestClient: FactoryProvider<RestClientService<never>> = {
	provide: TAXA_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService) =>
		new RestClientService(httpService, {
			name: "taxon",
			host: config.get<string>("LAJI_BACKEND_HOST") + "/taxon-search"
		}),
	inject: [HttpService, ConfigService],
};

@Module({
	providers: [TaxaService, TaxaRestClient],
	exports: [TaxaService]
})
export class TaxaModule {}
