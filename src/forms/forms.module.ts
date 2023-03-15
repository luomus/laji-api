import { DynamicModule, FactoryProvider, Module } from "@nestjs/common";
import { FormsService } from "./forms.service";
import { FormsController } from "./forms.controller";
import { HttpModule, HttpService } from "@nestjs/axios";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Form } from "./dto/form.dto";
import { PersonsModule } from "src/persons/persons.module";

const formClientConfigProvider: FactoryProvider<RestClientConfig> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("FORM_PATH") as string,
		auth: configService.get("FORM_AUTH") as string,
	}),
	inject: [ConfigService],
};

const formRestClientProvider: FactoryProvider<RestClientService<Form>> = {
	provide: "FORM_REST_CLIENT",
	useFactory: (httpService: HttpService, formClientConfig: RestClientConfig) =>
		new RestClientService(httpService, formClientConfig),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }],
};

@Module({
	imports: [HttpModule, PersonsModule],
	controllers: [FormsController],
	providers: [FormsService, formRestClientProvider, formClientConfigProvider]
})
export class FormsModule {}
