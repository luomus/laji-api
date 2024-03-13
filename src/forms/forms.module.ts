import { FactoryProvider, forwardRef, Module } from "@nestjs/common";
import { FormsService } from "./forms.service";
import { FormsController } from "./forms.controller";
import { HttpModule, HttpService } from "@nestjs/axios";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { Form } from "./dto/form.dto";
import { PersonsModule } from "src/persons/persons.module";
import { FormPermissionsModule } from "./form-permissions/form-permissions.module";
import { CollectionsModule } from "src/collections/collections.module";
import { CACHE_1_H } from "src/utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

const formClientConfigProvider: FactoryProvider<RestClientConfig<never>> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("FORM_PATH") as string,
		auth: configService.get("FORM_AUTH") as string,
		cache: CACHE_1_H
	}),
	inject: [ConfigService],
};

const formRestClientProvider: FactoryProvider<RestClientService<Form>> = {
	provide: "FORM_REST_CLIENT",
	useFactory: (httpService: HttpService, formClientConfig: RestClientConfig<never>, cache: RedisCacheService) =>
		new RestClientService(httpService, formClientConfig, cache),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }, RedisCacheService],
};

@Module({
	imports: [HttpModule, PersonsModule, forwardRef(() => FormPermissionsModule), CollectionsModule],
	controllers: [FormsController],
	providers: [FormsService, formRestClientProvider, formClientConfigProvider],
	exports: [FormsService]
})
export class FormsModule {}
