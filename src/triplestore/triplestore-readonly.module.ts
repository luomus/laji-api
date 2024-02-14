import { FactoryProvider, Module, forwardRef } from "@nestjs/common";
import { MetadataModule } from "src/metadata/metadata.module";
import { TriplestoreService } from "./triplestore.service";
import { HttpModule, HttpService } from "@nestjs/axios";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";
import { Cache } from "cache-manager";
import { ConfigService } from "@nestjs/config";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { MetadataService } from "src/metadata/metadata.service";

export const triplestoreReadonlyClientConfigProvider: FactoryProvider<RestClientConfig> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("TRIPLESTORE_READONLY_PATH") as string,
		auth: configService.get("TRIPLESTORE_READONLY_AUTH") as string,
	}),
	inject: [ConfigService],
};

export const triplestoreReadonlyRestClientProvider: FactoryProvider<RestClientService> = {
	provide: "TRIPLESTORE_REST_CLIENT",
	useFactory: (httpService: HttpService, storeClientConfig: RestClientConfig, cache: Cache) =>
		new RestClientService(httpService, storeClientConfig, cache),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }, { token: CACHE_MANAGER, optional: false }],
};

const triplestoreReadonlyServiceProvider: FactoryProvider<TriplestoreService> = {
	provide: "TRIPLESTORE_READONLY_SERVICE",
	useFactory: (triplestoreReadonlyClient: RestClientService, metadataService: MetadataService, cache: Cache) => {
		return new TriplestoreService(triplestoreReadonlyClient, metadataService, cache);
	},
	inject: [
		{ token: "TRIPLESTORE_REST_CLIENT", optional: false },
		MetadataService,
		{ token: CACHE_MANAGER, optional: false }
	],
};

@Module({
	imports: [forwardRef(() => MetadataModule), HttpModule],
	providers: [
		triplestoreReadonlyClientConfigProvider,
		triplestoreReadonlyRestClientProvider,
		triplestoreReadonlyServiceProvider,
	],
	exports: [triplestoreReadonlyServiceProvider, triplestoreReadonlyRestClientProvider]
})
export class TriplestoreReadonlyModule {}
