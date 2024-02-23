import { Module } from "@nestjs/common";
import { NotificationsModule } from "src/notifications/notifications.module";
import { PersonTokenModule } from "src/person-token/person-token.module";
import { ProfileService } from "./profile.service";
import { StoreClientModule } from "src/store/store-client/store-client.module";

@Module({
	providers: [ProfileService],
	imports: [StoreClientModule, PersonTokenModule, NotificationsModule],
	exports: [ProfileService]

})
export class ProfileModule {}
