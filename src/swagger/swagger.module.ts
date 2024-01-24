import { Module } from "@nestjs/common";
import { SwaggerService } from "./swagger.service";
import { StoreClientModule } from "src/store/store-client/store-client.module";
import { WarehouseModule } from "src/warehouse/warehouse.module";

@Module({
	imports: [StoreClientModule, WarehouseModule],
	providers: [SwaggerService]
})
export class SwaggerModule {}
