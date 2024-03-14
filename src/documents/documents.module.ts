import { FactoryProvider, Module } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { STORE_CLIENT, StoreClientModule } from "src/store/store-client/store-client.module";
import { RestClientService } from "src/rest-client/rest-client.service";
import { StoreService } from "src/store/store.service";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

const StoreResourceService: FactoryProvider<StoreService<never>> = {
	provide: "STORE_RESOURCE_SERVICE",
	useFactory: (client: RestClientService<never>, cache: RedisCacheService) =>
		new StoreService(client, cache, { resource: "document" }),
	inject: [
		{ token: STORE_CLIENT, optional: false },
		RedisCacheService
	],
};

@Module({
	providers: [DocumentsService, StoreResourceService],
	imports: [StoreClientModule],
	exports: [DocumentsService]
})
export class DocumentsModule {}
