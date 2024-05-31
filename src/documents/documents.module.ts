import { FactoryProvider, Module, forwardRef } from "@nestjs/common";
import { documentQueryKeys, DocumentsService } from "./documents.service";
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
import { WarehouseModule } from "src/warehouse/warehouse.module";
import { NamedPlacesModule } from "src/named-places/named-places.module";
import { PrepopulatedDocumentModule } from "src/named-places/prepopulated-document/prepopulated-document.module";
import { CACHE_10_MIN } from "src/utils";
import { ApiUsersModule } from "src/api-users/api-users.module";
import { AccessTokenModule } from "src/access-token/access-token.module";
import { SecondaryDocumentsService } from "./secondary-documents.service";
import { DocumentValidatorModule } from "./document-validator/document-validator.module";
import { DocumentsBatchService } from "./documents-batch/documents-batch.service";

const StoreResourceService: FactoryProvider<StoreService<never>> = {
	provide: "STORE_RESOURCE_SERVICE",
	useFactory: (client: RestClientService<never>, cache: RedisCacheService) =>
		new StoreService(client, cache, {
			resource: "document",
			cache: {
				ttl: CACHE_10_MIN,
				keys: documentQueryKeys,
				primaryKeySpaces: [
					["collectionID"],
					["creator"],
					["namedPlaceID"]
				]
			}
		}),
	inject: [
		{ token: STORE_CLIENT, optional: false },
		RedisCacheService
	],
};

@Module({
	providers: [DocumentsService, StoreResourceService, SecondaryDocumentsService, DocumentsBatchService],
	imports: [
		StoreClientModule, PersonsModule, FormPermissionsModule, FormsModule, CollectionsModule, WarehouseModule,
		forwardRef(() => NamedPlacesModule), PrepopulatedDocumentModule, ApiUsersModule, AccessTokenModule,
		forwardRef(() => DocumentValidatorModule)
	],
	exports: [DocumentsService],
	controllers: [DocumentsController]
})
export class DocumentsModule {}
