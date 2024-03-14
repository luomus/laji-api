import { FactoryProvider, Module, forwardRef } from "@nestjs/common";
import { MetadataModule } from "src/metadata/metadata.module";
import { TriplestoreService } from "./triplestore.service";
import { HttpService } from "@nestjs/axios";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";

export const TriplestoreRestClient: FactoryProvider<RestClientService<never>> = {
	provide: "TRIPLESTORE_REST_CLIENT",
	useFactory: (httpService: HttpService, config: ConfigService) =>
		new RestClientService(httpService, {
			name: "triplestore",
			host: config.get<string>("TRIPLESTORE_HOST"),
			auth: config.get<string>("TRIPLESTORE_AUTH"),
		}),
	inject: [HttpService, ConfigService],
};

@Module({
	imports: [forwardRef(() => MetadataModule)],
	providers: [
		TriplestoreRestClient,
		TriplestoreService
	],
	exports: [TriplestoreService]
})
export class TriplestoreModule {}
