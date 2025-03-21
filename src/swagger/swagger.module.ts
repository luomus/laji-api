import { Global, Module } from "@nestjs/common";
import { SwaggerService } from "./swagger.service";
import { StoreClientModule } from "src/store/store-client/store-client.module";

@Global()
@Module({
	imports: [StoreClientModule],
	providers: [SwaggerService],
	exports: [SwaggerService]
})
export class SwaggerModule {}
