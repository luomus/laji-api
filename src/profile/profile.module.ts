import { Module } from "@nestjs/common";
import { NotificationsModule } from "src/notifications/notifications.module";
import { PersonTokenModule } from "src/person-token/person-token.module";
import { StoreModule } from "src/store/store.module";
import { ProfileService } from "./profile.service";

@Module({
	providers: [ProfileService],
	imports: [StoreModule, PersonTokenModule, NotificationsModule],
	exports: [ProfileService]

})
export class ProfileModule {}
