import { FactoryProvider, Module } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { TaxaService } from "./taxa.service";
import { TAXA_CLIENT } from "src/provider-tokens";
import { TaxaController } from "./taxa.controller";
import { SwaggerModule } from "@nestjs/swagger";
import { ElasticModule } from "src/elastic/elastic.module";

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
	imports: [SwaggerModule, ElasticModule],
	providers: [TaxaService, TaxaRestClient],
	exports: [TaxaService],
	controllers: [TaxaController]
})
export class TaxaModule {}
