import { HttpException, Inject } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { StoreService } from "src/store/store.service";
import * as equals from "fast-deep-equal";
import { Query } from "src/store/store-query";
import { Optional, omit } from "src/typing.utils";
import { Person } from "src/persons/person.dto";
import { Notification } from "@luomus/laji-schema";
import { NotificationQuery } from "./notifications.module";

@Injectable()
export class NotificationsService {

	constructor(
		@Inject("STORE_RESOURCE_SERVICE") private store: StoreService<Notification, NotificationQuery>
	) {}

	async getPage(person: Person, onlyUnseen = false, page?: number, pageSize = 20) {
		const query: Query<NotificationQuery> = { toPerson: person.id };
		if (onlyUnseen) {
			query.seen = false;
		}
		return await this.store.getPage(query, page, pageSize);
	}

	async getByAnnotationIDAndPersonID(annotationID: string, personID: string) {
		const query = { "annotation.id": annotationID, toPerson: personID };
		return this.store.getAll(query);
	}

	async add(notification: Omit<Optional<Notification, "seen" | "created">, "id">) {
		notification.seen = false;
		notification.created = new Date().toISOString();
		return this.store.create(notification);
	}

	async getByIdAndPerson(id: string, person: Person) {
		const notification = await this.store.get(id);
		if (notification.toPerson !== person.id) {
			throw new HttpException("This isn't your notification", 403);
		}
		return notification;
	}

	async update(id: string, notification: Notification & { id: string }, person: Person) {
		const existing = await this.getByIdAndPerson(id, person);
		if (!existing) {
			throw new HttpException("No notification found to update", 404);
		}
		if (!equals(omit(existing, "seen"), omit(notification, "seen"))) {
			throw new HttpException("You can only update the 'seen' property", 422);
		}
		return this.store.update(notification);
	}

	async delete(id: string, person: Person) {
		const existing = await this.getByIdAndPerson(id, person);
		if (!existing) {
			throw new HttpException("No notification found to delete", 404);
		}
		return this.store.delete(id);
	}
}
