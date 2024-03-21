import { FactoryProvider, Module } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { StoreClientModule } from "src/store/store-client/store-client.module";
import { RestClientService } from "src/rest-client/rest-client.service";
import { StoreService } from "src/store/store.service";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { STORE_CLIENT } from "src/provider-tokens";
import { DocumentsController } from "./documents.controller";
import { FormPermissionsModule } from "src/forms/form-permissions/form-permissions.module";
import { PersonsModule } from "src/persons/persons.module";
import { FormsModule } from "src/forms/forms.module";
import { CollectionsModule } from "src/collections/collections.module";

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
	imports: [StoreClientModule, PersonsModule, FormPermissionsModule, FormsModule, CollectionsModule],
	exports: [DocumentsService],
	controllers: [DocumentsController]
})
export class DocumentsModule {}
