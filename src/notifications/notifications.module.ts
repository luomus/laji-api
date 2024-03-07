import { FactoryProvider, Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { PersonTokenModule } from "src/person-token/person-token.module";
import { StoreClientModule } from "src/store/store-client/store-client.module";
import { StoreConfig, StoreService } from "src/store/store.service";
import { RestClientService } from "src/rest-client/rest-client.service";
import { CACHE_1_MIN } from "src/utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

const storeResourceConfig: FactoryProvider<StoreConfig> = {
	provide: "STORE_RESOURCE_CONFIG",
	useFactory: () => ({
		resource: "notification",
		cache: { ttl: CACHE_1_MIN, keys: ["toPerson", "seen"], primaryKeys: ["toPerson"] }
	})
};

const storeResourceServiceProvider: FactoryProvider<StoreService<never>> = {
	provide: "STORE_RESOURCE_SERVICE",
	useFactory: (storeRestClient: RestClientService<never>, cache: RedisCacheService, config: StoreConfig<never>) =>
		new StoreService(storeRestClient, cache, config),
	inject: [
		{ token: "STORE_REST_CLIENT", optional: false },
		RedisCacheService,
		{ token: "STORE_RESOURCE_CONFIG", optional: false }
	],
};

@Module({
	imports: [StoreClientModule, PersonTokenModule],
	providers: [NotificationsService, storeResourceConfig, storeResourceServiceProvider],
	exports: [NotificationsService],
	controllers: [NotificationsController],
})
export class NotificationsModule {}
