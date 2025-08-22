import { FactoryProvider, Module, forwardRef } from "@nestjs/common";
import { AllowedPageQueryKeys, NamedPlacesService } from "./named-places.service";
import { NamedPlacesController } from "./named-places.controller";
import { PersonsModule } from "src/persons/persons.module";
import { FormsModule } from "src/forms/forms.module";
import { FormPermissionsModule } from "src/forms/form-permissions/form-permissions.module";
import { PrepopulatedDocumentModule } from "./prepopulated-document/prepopulated-document.module";
import { DocumentsModule } from "src/documents/documents.module";
import { CollectionsModule } from "src/collections/collections.module";
import { StoreClientModule } from "src/store/store-client/store-client.module";
import { StoreService } from "src/store/store.service";
import { RestClientService } from "src/rest-client/rest-client.service";
import { NamedPlace } from "./named-places.dto";
import { CACHE_1_H } from "src/utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { MailModule } from "src/mail/mail.module";
import { STORE_CLIENT } from "src/provider-tokens";

const StoreResourceService: FactoryProvider<StoreService<NamedPlace>> = {
	provide: "STORE_RESOURCE_SERVICE",
	useFactory: (client: RestClientService<NamedPlace>, cache: RedisCacheService) =>
		new StoreService(client, cache, {
			resource: "namedPlace",
			serializeInto: NamedPlace,
			cache: {
				ttl: CACHE_1_H * 6,
				keys: [...AllowedPageQueryKeys, "owners", "editors"],
				primaryKeySpaces: [
					["collectionID"],
					["id"]
				]
			}
		}),
	inject: [
		{ token: STORE_CLIENT, optional: false },
		RedisCacheService
	],
};

@Module({
	providers: [NamedPlacesService, StoreResourceService],
	imports: [
		StoreClientModule, PersonsModule, forwardRef(() => FormsModule), FormPermissionsModule,
		PrepopulatedDocumentModule, forwardRef(() => DocumentsModule), CollectionsModule, MailModule
	],
	controllers: [NamedPlacesController],
	exports: [NamedPlacesService]
})
export class NamedPlacesModule {}
