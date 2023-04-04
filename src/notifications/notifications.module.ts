import { Module } from "@nestjs/common";
import { StoreModule } from "src/store/store.module";
import { NotificationsService } from "./notifications.service";

@Module({
	imports: [StoreModule],
	providers: [NotificationsService],
	exports: [NotificationsService],
})
export class NotificationsModule {}
