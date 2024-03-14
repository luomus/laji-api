import { FactoryProvider, Module } from "@nestjs/common";
import { NotificationsModule } from "src/notifications/notifications.module";
import { PersonTokenModule } from "src/person-token/person-token.module";
import { ProfileService } from "./profile.service";
import { STORE_CLIENT, StoreClientModule } from "src/store/store-client/store-client.module";
import { StoreService } from "src/store/store.service";
import { RestClientService } from "src/rest-client/rest-client.service";
import { Profile } from "./profile.dto";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

const StoreResourceService: FactoryProvider<StoreService<Profile>> = {
	provide: "STORE_RESOURCE_SERVICE",
	useFactory: (client: RestClientService<never>, cache: RedisCacheService) =>
		new StoreService(client, cache, { resource: "profile", serializeInto: Profile }),
	inject: [
		{ token: STORE_CLIENT, optional: false },
		RedisCacheService
	],
};


@Module({
	providers: [ProfileService, StoreResourceService],
	imports: [StoreClientModule, PersonTokenModule, NotificationsModule],
	exports: [ProfileService]

})
export class ProfileModule {}
