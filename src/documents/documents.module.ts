import { FactoryProvider, Module } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { StoreClientModule } from "src/store/store-client/store-client.module";
import { RestClientService } from "src/rest-client/rest-client.service";
import { StoreConfig, StoreService } from "src/store/store.service";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";

const storeResourceConfig: FactoryProvider<StoreConfig> = {
	provide: "STORE_RESOURCE_CONFIG",
	useFactory: () => ({
		resource: "document"
	})
};

const storeResourceServiceProvider: FactoryProvider<StoreService<never>> = {
	provide: "STORE_RESOURCE_SERVICE",
	useFactory: (storeRestClient: RestClientService<never>, cache: Cache, config: StoreConfig) =>
		new StoreService(storeRestClient, cache, config),
	inject: [
		{ token: "STORE_REST_CLIENT", optional: false },
		{ token: CACHE_MANAGER, optional: false },
		{ token: "STORE_RESOURCE_CONFIG", optional: false }
	],
};


@Module({
	providers: [DocumentsService, storeResourceConfig, storeResourceServiceProvider],
	imports: [StoreClientModule],
	exports: [DocumentsService]
})
export class DocumentsModule {}
