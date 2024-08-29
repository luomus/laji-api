import { FactoryProvider, Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { StoreClientModule } from "src/store/store-client/store-client.module";
import { StoreService } from "src/store/store.service";
import { RestClientService } from "src/rest-client/rest-client.service";
import { CACHE_1_MIN } from "src/utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { STORE_CLIENT } from "src/provider-tokens";

const StoreResourceService: FactoryProvider<StoreService<never>> = {
	provide: "STORE_RESOURCE_SERVICE",
	useFactory: (client: RestClientService<never>, cache: RedisCacheService) =>
		new StoreService(client, cache, {
			resource: "notification",
			cache: { ttl: CACHE_1_MIN, keys: ["toPerson", "seen", "annotation.id"], primaryKeys: ["toPerson"] }
		}),
	inject: [
		{ token: STORE_CLIENT, optional: false },
		RedisCacheService
	],
};

@Module({
	imports: [StoreClientModule],
	providers: [NotificationsService, StoreResourceService],
	exports: [NotificationsService],
	controllers: [NotificationsController],
})
export class NotificationsModule {}
