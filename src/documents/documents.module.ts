import { FactoryProvider, Module } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { StoreClientModule } from "src/store/store-client/store-client.module";
import { RestClientService } from "src/rest-client/rest-client.service";
import { StoreConfig, StoreService } from "src/store/store.service";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

const storeResourceConfig: FactoryProvider<StoreConfig> = {
	provide: "STORE_RESOURCE_CONFIG",
	useFactory: () => ({
		resource: "document"
	})
};

const storeResourceServiceProvider: FactoryProvider<StoreService<never>> = {
	provide: "STORE_RESOURCE_SERVICE",
	useFactory: (storeRestClient: RestClientService<never>, cache: RedisCacheService, config: StoreConfig) =>
		new StoreService(storeRestClient, cache, config),
	inject: [
		{ token: "STORE_REST_CLIENT", optional: false },
		RedisCacheService,
		{ token: "STORE_RESOURCE_CONFIG", optional: false }
	],
};


@Module({
	providers: [DocumentsService, storeResourceConfig, storeResourceServiceProvider],
	imports: [StoreClientModule],
	exports: [DocumentsService]
})
export class DocumentsModule {}
