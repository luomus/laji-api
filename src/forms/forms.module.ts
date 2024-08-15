import { FactoryProvider, forwardRef, Module } from "@nestjs/common";
import { FormsService } from "./forms.service";
import { FormsController } from "./forms.controller";
import { HttpService } from "@nestjs/axios";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { Form } from "./dto/form.dto";
import { PersonsModule } from "src/persons/persons.module";
import { FormPermissionsModule } from "./form-permissions/form-permissions.module";
import { CollectionsModule } from "src/collections/collections.module";
import { CACHE_1_H } from "src/utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { FORM_CLIENT } from "src/provider-tokens";

const FormClient: FactoryProvider<RestClientService<Form>> = {
	provide: FORM_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService, cache: RedisCacheService) =>
		new RestClientService(httpService, {
			name: "form",
			host: config.get<string>("FORM_HOST"),
			auth: config.get<string>("FORM_AUTH"),
			cache: CACHE_1_H
		}, cache),
	inject: [HttpService, ConfigService, RedisCacheService],
};

@Module({
	imports: [PersonsModule, forwardRef(() => FormPermissionsModule), CollectionsModule],
	controllers: [FormsController],
	providers: [FormsService, FormClient],
	exports: [FormsService]
})
export class FormsModule {}
