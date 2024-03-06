import { FactoryProvider, forwardRef, Module } from "@nestjs/common";
import { CollectionsModule } from "src/collections/collections.module";
import { MailModule } from "src/mail/mail.module";
import { PersonsModule } from "src/persons/persons.module";
import { FormsModule } from "../forms.module";
import { FormPermissionsService } from "./form-permissions.service";
import { StoreClientModule } from "src/store/store-client/store-client.module";
import { RestClientService } from "src/rest-client/rest-client.service";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { StoreConfig, StoreService } from "src/store/store.service";
import { CACHE_1_H } from "src/utils";

const storeResourceConfig: FactoryProvider<StoreConfig> = {
	provide: "STORE_RESOURCE_CONFIG",
	useFactory: () => ({
		resource: "formPermissionSingle",
		cache: { ttl: CACHE_1_H,
			keys: ["collectionID", "userID"],
			primaryKeySpaces: [
				["userID"],
				["collectionID"],
				["collectionID", "userID"]
			]


		} // Primary keys configured per query in the service.
	})
};

const storeResourceServiceProvider: FactoryProvider<StoreService<never>> = {
	provide: "STORE_RESOURCE_SERVICE",
	useFactory: (storeRestClient: RestClientService<never>, cache: Cache, config: StoreConfig<never>) =>
		new StoreService(storeRestClient, cache, config),
	inject: [
		{ token: "STORE_REST_CLIENT", optional: false },
		{ token: CACHE_MANAGER, optional: false },
		{ token: "STORE_RESOURCE_CONFIG", optional: false }
	],
};


@Module({
	imports: [PersonsModule, StoreClientModule, forwardRef(() => FormsModule), CollectionsModule, MailModule],
	providers: [FormPermissionsService, storeResourceServiceProvider, storeResourceConfig],
	exports: [FormPermissionsService]
})
export class FormPermissionsModule {}
