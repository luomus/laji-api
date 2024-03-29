import { FactoryProvider, Module } from "@nestjs/common";
import { WarehouseService } from "./warehouse.service";
import { HttpService } from "@nestjs/axios";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { WarehouseController } from "./warehouse.controller";
import { WAREHOUSE_CLIENT } from "src/provider-tokens";

const WarehouseClient: FactoryProvider<RestClientService<never>> = {
	provide: WAREHOUSE_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService) =>
		new RestClientService(httpService, {
			name: "warehouse",
			host: config.get<string>("WAREHOUSE_HOST")
		}),
	inject: [
		HttpService,
		ConfigService
	],
};

@Module({
	controllers: [WarehouseController],
	providers: [WarehouseService, WarehouseClient]
})
export class WarehouseModule {}
