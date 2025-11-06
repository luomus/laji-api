import { FactoryProvider, Module } from "@nestjs/common";
import { AnnotationsController } from "./annotations.controller";
import { AnnotationsService } from "./annotations.service";
import { DocumentsModule } from "src/documents/documents.module";
import { StoreClientModule } from "src/store/store-client/store-client.module";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { STORE_CLIENT } from "src/provider-tokens";
import { StoreService } from "src/store/store.service";
import { RestClientService } from "src/rest-client/rest-client.service";
import { CACHE_10_MIN } from "src/utils";
import { TriplestoreReadonlyModule } from "src/triplestore/triplestore-readonly.module";
import { FormPermissionsModule } from "src/form-permissions/form-permissions.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { WarehouseModule } from "src/warehouse/warehouse.module";

const StoreResourceService: FactoryProvider<StoreService<never>> = {
	provide: "STORE_RESOURCE_SERVICE",
	useFactory: (client: RestClientService<never>, cache: RedisCacheService) =>
		new StoreService(client, cache, {
			resource: "annotation",
			cache: {
				ttl: CACHE_10_MIN,
				keys: ["rootID"],
				primaryKeys: ["rootID"]
			}
		}),
	inject: [
		{ token: STORE_CLIENT, optional: false },
		RedisCacheService
	],
};


@Module({
	controllers: [AnnotationsController],
	imports: [DocumentsModule, StoreClientModule, TriplestoreReadonlyModule, FormPermissionsModule,
		NotificationsModule, WarehouseModule],
	providers: [AnnotationsService, StoreResourceService]
})
export class AnnotationsModule {}
