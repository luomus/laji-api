import { FactoryProvider, Module, forwardRef } from "@nestjs/common";
import { MetadataModule } from "src/metadata/metadata.module";
import { TriplestoreService } from "./triplestore.service";
import { HttpModule, HttpService } from "@nestjs/axios";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

const triplestoreClientConfigProvider: FactoryProvider<RestClientConfig<never>> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("TRIPLESTORE_PATH") as string,
		auth: configService.get("TRIPLESTORE_AUTH") as string,
	}),
	inject: [ConfigService],
};

export const triplestoreRestClientProvider: FactoryProvider<RestClientService<never>> = {
	provide: "TRIPLESTORE_REST_CLIENT",
	useFactory: (httpService: HttpService, storeClientConfig: RestClientConfig<never>, cache: RedisCacheService) =>
		new RestClientService(httpService, storeClientConfig, cache),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }, RedisCacheService],
};

@Module({
	imports: [HttpModule, forwardRef(() => MetadataModule)],
	providers: [
		triplestoreClientConfigProvider,
		triplestoreRestClientProvider,
		TriplestoreService
	],
	exports: [TriplestoreService]
})
export class TriplestoreModule {}
