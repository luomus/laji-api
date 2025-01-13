import { FactoryProvider, Module, forwardRef } from "@nestjs/common";
import { MetadataModule } from "src/metadata/metadata.module";
import { TriplestoreService } from "./triplestore.service";
import { HttpService } from "@nestjs/axios";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { MetadataService } from "src/metadata/metadata.service";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { TRIPLESTORE_CLIENT } from "src/provider-tokens";
import { CACHE_1_H } from "src/utils";

export const TriplestoreReadonlyRestClient: FactoryProvider<RestClientService<never>> = {
	provide: TRIPLESTORE_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService, cache: RedisCacheService) =>
		new RestClientService(httpService,
			{
				name: "triplestore-readonly",
				host: config.get<string>("TRIPLESTORE_READONLY_HOST"),
				auth: config.get<string>("TRIPLESTORE_READONLY_AUTH"),
				cache: { ttl: CACHE_1_H }
			}, cache),
	inject: [HttpService, ConfigService, RedisCacheService],
};

const TriplestoreReadonlyService: FactoryProvider<TriplestoreService> = {
	provide: "TRIPLESTORE_READONLY_SERVICE",
	useFactory: (
		triplestoreReadonlyClient: RestClientService<never>,
		metadataService: MetadataService,
		cache: RedisCacheService
	) =>
		new TriplestoreService(triplestoreReadonlyClient, metadataService, cache),
	inject: [
		{ token: TRIPLESTORE_CLIENT, optional: false },
		MetadataService,
		RedisCacheService
	],
};

@Module({
	imports: [forwardRef(() => MetadataModule)],
	providers: [
		TriplestoreReadonlyRestClient,
		TriplestoreReadonlyService,
	],
	exports: [TriplestoreReadonlyService, TriplestoreReadonlyRestClient]
})
export class TriplestoreReadonlyModule {}
