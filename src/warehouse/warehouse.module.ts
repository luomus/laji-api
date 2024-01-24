import { FactoryProvider, Module } from "@nestjs/common";
import { WarehouseService } from "./warehouse.service";
import { HttpModule, HttpService } from "@nestjs/axios";
import { RestClientConfig, RestClientService } from "src/rest-client/rest-client.service";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { WarehouseController } from "./warehouse.controller";

const warehouseClientConfigProvider: FactoryProvider<RestClientConfig> = {
	provide: "WAREHOUSE_REST_CLIENT_CONFIG",
	useFactory: (configService: ConfigService) => ({
		path: configService.get("WAREHOUSE_PATH") as string
	}),
	inject: [ConfigService],
};

const warehouseRestClientProvider: FactoryProvider<RestClientService> = {
	provide: "WAREHOUSE_REST_CLIENT",
	useFactory: (httpService: HttpService, formClientConfig: RestClientConfig, cache: Cache) =>
		new RestClientService(httpService, formClientConfig, cache),
	inject: [
		HttpService,
		{ token: "WAREHOUSE_REST_CLIENT_CONFIG", optional: false },
		{ token: CACHE_MANAGER, optional: false }
	],
};

@Module({
	imports: [HttpModule],
	controllers: [WarehouseController],
	providers: [WarehouseService, warehouseRestClientProvider, warehouseClientConfigProvider],
	exports: [warehouseRestClientProvider]
})
export class WarehouseModule {}
