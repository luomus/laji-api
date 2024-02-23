import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { PersonTokenModule } from "src/person-token/person-token.module";
import { StoreClientModule } from "src/store/store-client/store-client.module";

@Module({
	imports: [StoreClientModule, PersonTokenModule],
	providers: [NotificationsService],
	exports: [NotificationsService],
	controllers: [NotificationsController],
})
export class NotificationsModule {}
