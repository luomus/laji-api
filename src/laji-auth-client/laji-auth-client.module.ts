import { HttpService } from "@nestjs/axios";
import { FactoryProvider, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RestClientService } from "src/rest-client/rest-client.service";
import { LajiAuthClientService } from "./laji-auth-client.service";
import { LAJI_AUTH_CLIENT } from "src/provider-tokens";

const lajiAuthClient: FactoryProvider<RestClientService<never>> = {
	provide: LAJI_AUTH_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService) =>
		new RestClientService(httpService, {
			name: "laji-auth-client",
			host: config.get<string>("LAJI_AUTH_HOST")
		}),
	inject: [HttpService, ConfigService],
};

@Module({
	providers: [LajiAuthClientService, lajiAuthClient]
})
export class LajiAuthClientModule {}
