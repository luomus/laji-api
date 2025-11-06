import { FactoryProvider, forwardRef, Module } from "@nestjs/common";
import { CollectionsModule } from "src/collections/collections.module";
import { MailModule } from "src/mail/mail.module";
import { PersonsModule } from "src/persons/persons.module";
import { FormsModule } from "src/forms/forms.module";
import { FormPermissionsService } from "./form-permissions.service";
import { StoreClientModule } from "src/store/store-client/store-client.module";
import { RestClientService } from "src/rest-client/rest-client.service";
import { StoreService } from "src/store/store.service";
import { CACHE_1_H } from "src/utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { STORE_CLIENT } from "src/provider-tokens";
import { FormPermissionsController } from "./form-permissions.controller";

const StoreResourceService: FactoryProvider<StoreService<never>> = {
	provide: "STORE_RESOURCE_SERVICE",
	useFactory: (client: RestClientService<never>, cache: RedisCacheService) =>
		new StoreService(client, cache, {
			resource: "formPermissionSingle",
			cache: { ttl: CACHE_1_H,
				keys: ["collectionID", "userID"],
				primaryKeySpaces: [
					["userID"],
					["collectionID"],
					["collectionID", "userID"]
				]
			}
		}),
	inject: [
		{ token: STORE_CLIENT, optional: false },
		RedisCacheService
	],
};

@Module({
	imports: [PersonsModule, StoreClientModule, forwardRef(() => FormsModule), CollectionsModule, MailModule],
	controllers: [FormPermissionsController],
	providers: [FormPermissionsService, StoreResourceService],
	exports: [FormPermissionsService]
})
export class FormPermissionsModule {}
