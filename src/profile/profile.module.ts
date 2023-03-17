import { Module } from "@nestjs/common";
import { StoreModule } from "src/store/store.module";
import { ProfileService } from "./profile.service";

@Module({
	providers: [ProfileService],
	imports: [StoreModule],
	exports: [ProfileService]

})
export class ProfileModule {}
