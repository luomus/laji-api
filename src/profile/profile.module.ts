import { Module } from "@nestjs/common";
import { PersonTokenModule } from "src/person-token/person-token.module";
import { StoreModule } from "src/store/store.module";
import { ProfileService } from "./profile.service";

@Module({
	providers: [ProfileService],
	imports: [StoreModule, PersonTokenModule],
	exports: [ProfileService]

})
export class ProfileModule {}
