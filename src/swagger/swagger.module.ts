import { Module } from "@nestjs/common";
import { SwaggerService } from "./swagger.service";
import { StoreClientModule } from "src/store/store-client/store-client.module";

@Module({
	imports: [StoreClientModule],
	providers: [SwaggerService]
})
export class SwaggerModule {}
