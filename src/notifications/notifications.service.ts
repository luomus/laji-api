import { HttpException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { PersonTokenService } from "src/person-token/person-token.service";
import { StoreService } from "src/store/store.service";
import { Optional } from "src/serializing/serializing";
import { CACHE_1_MIN } from "src/utils";
import { paginateAlreadyPaged } from "src/pagination";
import { Notification } from "./notification.dto";
import * as equals from "fast-deep-equal";

@Injectable()
export class NotificationsService {
	private storeNotificationsService =
		this.storeService.forResource<Notification>("notification", { cache: CACHE_1_MIN });

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
		const pagedResult = await this.storeNotificationsService.getPage(query, page, pageSize);
		const { totalItems, member, currentPage, lastPage } = pagedResult;
		return paginateAlreadyPaged({ results: member, total: totalItems, pageSize, currentPage, lastPage });
	}

	add(notification: Omit<Optional<Notification, "seen" | "created">, "id">) {
		notification.seen = false;
		notification.created = now();
		return this.storeNotificationsService.create(notification);
	}

	/** @throws HttpException */
	async findByIdAndPersonToken(id: string, personToken: string) {
		const personId = await this.personTokenService.getPersonIdFromToken(personToken);
		const notification = await this.storeNotificationsService.findOne(id);
		if (notification?.toPerson !== personId) {
			throw new HttpException("This isn't your notification", 403);
		}
		return notification;
	}

	/** @throws HttpException */
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

	/** @throws HttpException */
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
};
