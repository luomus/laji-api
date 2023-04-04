import { Injectable } from "@nestjs/common";
import { StoreService } from "src/store/store.service";
import { Optional } from "src/type-utils";
import { Notification } from "./notification.dto";

@Injectable()
export class NotificationsService {
	constructor(
		private storeService: StoreService) {}

	// TODO cache bust
	add(notification: Omit<Optional<Notification, "seen" | "created">, "id">) {
		notification.seen = false;
		notification.created = now();
		return this.storeService.create("notification", notification);
	}
}

const now = () => {
	return new Date().toISOString();
}
