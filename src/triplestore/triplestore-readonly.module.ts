import { FactoryProvider, Module, forwardRef } from "@nestjs/common";
import { MetadataModule } from "src/metadata/metadata.module";
import { TriplestoreService } from "./triplestore.service";
import { HttpModule, HttpService } from "@nestjs/axios";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { MetadataService } from "src/metadata/metadata.service";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

export const triplestoreReadonlyClientConfigProvider: FactoryProvider<RestClientConfig<never>> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("TRIPLESTORE_READONLY_PATH") as string,
		auth: configService.get("TRIPLESTORE_READONLY_AUTH") as string,
	}),
	inject: [ConfigService],
};

export const triplestoreReadonlyRestClientProvider: FactoryProvider<RestClientService<never>> = {
	provide: "TRIPLESTORE_REST_CLIENT",
	useFactory: (httpService: HttpService, storeClientConfig: RestClientConfig<never>, cache: RedisCacheService) =>
		new RestClientService(httpService, storeClientConfig, cache),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }, RedisCacheService],
};

const triplestoreReadonlyServiceProvider: FactoryProvider<TriplestoreService> = {
	provide: "TRIPLESTORE_READONLY_SERVICE",
	useFactory: (
		triplestoreReadonlyClient: RestClientService<never>,
		metadataService: MetadataService,
		cache: RedisCacheService
	) =>
		new TriplestoreService(triplestoreReadonlyClient, metadataService, cache),
	inject: [
		{ token: "TRIPLESTORE_REST_CLIENT", optional: false },
		MetadataService,
		RedisCacheService
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
