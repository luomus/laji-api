import { FactoryProvider, Module } from "@nestjs/common";
import { AllowedPageQueryKeys, NamedPlacesService } from "./named-places.service";
import { NamedPlacesController } from "./named-places.controller";
import { PersonsModule } from "src/persons/persons.module";
import { FormsModule } from "src/forms/forms.module";
import { FormPermissionsModule } from "src/forms/form-permissions/form-permissions.module";
import { PrepopulatedDocumentModule } from "./prepopulated-document/prepopulated-document.module";
import { DocumentsModule } from "src/documents/documents.module";
import { CollectionsModule } from "src/collections/collections.module";
import { StoreClientModule } from "src/store/store-client/store-client.module";
import { StoreConfig, StoreService } from "src/store/store.service";
import { RestClientService } from "src/rest-client/rest-client.service";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { NamedPlace } from "./named-places.dto";
import { CACHE_1_H } from "src/utils";

const storeResourceConfig: FactoryProvider<StoreConfig<NamedPlace>> = {
	provide: "STORE_RESOURCE_CONFIG",
	useFactory: () => ({
		resource: "namedPlace", serializeInto: NamedPlace, cache: {
			ttl: CACHE_1_H * 6,
			keys: AllowedPageQueryKeys
		}
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
	providers: [NamedPlacesService, storeResourceConfig, storeResourceServiceProvider],
	imports: [StoreClientModule, PersonsModule, FormsModule, FormPermissionsModule, PrepopulatedDocumentModule,
		DocumentsModule, CollectionsModule],
	controllers: [NamedPlacesController]
})
export class NamedPlacesModule {}
