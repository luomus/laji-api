import { Module } from "@nestjs/common";
import { StoreClientModule } from "src/store-client/store-client.module";
import { ProfileService } from "./profile.service";

@Module({
	providers: [ProfileService],
	imports: [StoreClientModule],
	exports: [ProfileService]

})
export class ProfileModule {}
