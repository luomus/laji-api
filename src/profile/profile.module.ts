import { FactoryProvider, Module } from "@nestjs/common";
import { NotificationsModule } from "src/notifications/notifications.module";
import { PersonTokenModule } from "src/person-token/person-token.module";
import { ProfileService } from "./profile.service";
import { StoreClientModule } from "src/store/store-client/store-client.module";
import { StoreConfig, StoreService } from "src/store/store.service";
import { RestClientService } from "src/rest-client/rest-client.service";
import { Profile } from "./profile.dto";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

const storeResourceConfig: FactoryProvider<StoreConfig<Profile>> = {
	provide: "STORE_RESOURCE_CONFIG",
	useFactory: () => ({ resource: "profile", serializeInto: Profile })
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
	providers: [ProfileService, storeResourceServiceProvider, storeResourceConfig],
	imports: [StoreClientModule, PersonTokenModule, NotificationsModule],
	exports: [ProfileService]

})
export class ProfileModule {}
