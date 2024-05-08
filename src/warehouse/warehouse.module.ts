import { FactoryProvider, Module } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { WarehouseController } from "./warehouse.controller";
import { WAREHOUSE_CLIENT } from "src/provider-tokens";
import { WarehouseService } from "./warehouse.service";

const WarehouseRestClient: FactoryProvider<RestClientService<never>> = {
	provide: WAREHOUSE_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService) =>
		new RestClientService(httpService, {
			name: "warehouse",
			host: config.get<string>("WAREHOUSE_HOST"),
			headers: {
				access_token: config.get<string>("WAREHOUSE_TOKEN")
			}
		}),
	inject: [
		HttpService,
		ConfigService
	],
};

@Module({
	providers: [WarehouseRestClient, WarehouseService],
	controllers: [WarehouseController],
	exports: [WarehouseService]
})
export class WarehouseModule {}
