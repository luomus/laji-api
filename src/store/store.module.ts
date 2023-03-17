import { Module } from "@nestjs/common";
import { StoreClientModule } from "./store-client/store-client.module";
import { StoreService } from "./store.service";

@Module({
	imports: [StoreClientModule],
	providers: [StoreService],
	exports: [StoreService]
})
export class StoreModule {}
