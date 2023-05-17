import { HttpException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { PersonTokenService } from "src/person-token/person-token.service";
import { StoreService } from "src/store/store.service";
import { Optional } from "src/type-utils";
import { CACHE_1_MIN, paginateAlreadyPaged } from "src/utils";
import { Notification } from "./notification.dto";
import * as equals from "fast-deep-equal";

@Injectable()
export class NotificationsService {
	private storeNotificationsService =
		this.storeService.forResource<Notification>("notification", { cache: CACHE_1_MIN })

	constructor(
		private storeService: StoreService,
		private personTokenService: PersonTokenService
	) {}

	async getPage(personToken: string, onlyUnseen = false, page?: number, pageSize = 20) {
		const personId = await this.personTokenService.getPersonIdFromToken(personToken);
		let query = `toPerson:"${personId}"`;
		if (onlyUnseen) {
			query += " AND seen: \"false\"";
		}
		const pagedResult = await this.storeNotificationsService.query(query, page, pageSize);
		const { totalItems, member, currentPage, lastPage } = pagedResult;
		return paginateAlreadyPaged({ results: member, total: totalItems, pageSize, currentPage, last: lastPage });
	}


	add(notification: Omit<Optional<Notification, "seen" | "created">, "id">) {
		notification.seen = false;
		notification.created = now();
		return this.storeNotificationsService.create(notification);
	}

	async findByIdAndPersonToken(id: string, personToken: string) {
		const personId = await this.personTokenService.getPersonIdFromToken(personToken);
		const notification = await this.storeNotificationsService.findOne(id);
		if (notification?.toPerson !== personId) {
			throw new HttpException("This isn't your notification", 403);
		}
		return notification;
	}

	async update(id: string, notification: Notification, personToken: string) {
		const existing = await this.findByIdAndPersonToken(id, personToken);
		if (!existing) {
			throw new HttpException("No notification found by id to update", 404);
		}
		const { seen, ...existingWithoutSeen } = existing;
		const { seen: seen2, ...notificationWithoutSeen } = notification;
		if (!equals(existingWithoutSeen, notificationWithoutSeen)) {
			throw new HttpException("You can only update seen property", 422);
		}
		return this.storeNotificationsService.update(notification);
	}

	async delete(id: string, personToken: string) {
		const existing = await this.findByIdAndPersonToken(id, personToken);
		if (!existing) {
			throw new HttpException("No notification found by id to delete", 404);
		}
		return this.storeNotificationsService.delete(id);
	}
}

const now = () => {
	return new Date().toISOString();
}
