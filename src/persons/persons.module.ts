import { HttpModule, HttpService } from "@nestjs/axios";
import { FactoryProvider, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PersonTokenModule } from "src/person-token/person-token.module";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";
import { IctAdminGuard } from "./ict-admin/ict-admin.guard";
import { Person } from "./person.dto";
import { PersonsController } from "./persons.controller";
import { PersonsService } from "./persons.service";

const storeClientConfigProvider: FactoryProvider<RestClientConfig> = {
	provide: "REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("STORE_PATH") as string,
		auth: configService.get("STORE_AUTH") as string,
	}),
	inject: [ConfigService],
};

const storeRestClientProvider: FactoryProvider<RestClientService<Person>> = {
	provide: "STORE_REST_CLIENT",
	useFactory: (httpService: HttpService, storeClientConfig: RestClientConfig) =>
		new RestClientService(httpService, storeClientConfig),
	inject: [HttpService, { token: "REST_CLIENT_CONFIG", optional: false }],
};

@Module({
	imports: [HttpModule, PersonTokenModule],
	controllers: [PersonsController],
	providers: [PersonsService, storeRestClientProvider, storeClientConfigProvider, IctAdminGuard],
	exports: [IctAdminGuard, PersonsService]
})
export class PersonsModule {}
