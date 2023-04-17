import { Module } from "@nestjs/common";
import { StoreModule } from "src/store/store.module";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { PersonTokenModule } from "src/person-token/person-token.module";

@Module({
	imports: [StoreModule, PersonTokenModule],
	providers: [NotificationsService],
	exports: [NotificationsService],
	controllers: [NotificationsController],
})
export class NotificationsModule {}
