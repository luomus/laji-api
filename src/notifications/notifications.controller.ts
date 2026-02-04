import { Body, Delete, Get, Param, Put, Query, UseInterceptors } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiTags } from "@nestjs/swagger";
import { GetNotificationsDto } from "./notification.dto";
import { Notification } from "@luomus/laji-schema";
import { NotificationsService } from "./notifications.service";
import { SwaggerRemote } from "src/swagger/swagger-remote.decorator";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { RequestPerson }from "src/decorators/request-person.decorator";
import { Person } from "src/persons/person.dto";
import { SelectedFields } from "src/interceptors/selected-fields.interceptor";

@LajiApiController("notifications")
@ApiTags("Notifications")
export class NotificationsController {
	constructor(private notificationsService: NotificationsService) {}

	/* Get notifications */
	@ApiExcludeEndpoint()
	@SwaggerRemote({ source: "store", ref: "/notification" })
	@Get(":personToken")
	getAll(
		@Query() { page, pageSize, onlyUnSeen }: GetNotificationsDto,
		@Param("personToken") _: string,
		@RequestPerson() person: Person
	) {
		return this.notificationsService.getPage(person, onlyUnSeen, page, pageSize);
	}

	/* Get notifications */
	@SwaggerRemote({ source: "store", ref: "/notification" })
	@Get()
	@UseInterceptors(SelectedFields)
	getAllV1(
		@Query() { page, pageSize, onlyUnSeen }: GetNotificationsDto,
		@RequestPerson() person: Person
	) {
		return this.notificationsService.getPage(person, onlyUnSeen, page, pageSize);
	}

	/* Update notification */
	@Put(":id")
	@SwaggerRemote({ source: "store", ref: "/notification" })
	update(
		@Param("id") id: string,
		@Body() notification: Notification & { id: string },
		@RequestPerson() person: Person
	) {
		return this.notificationsService.update(id, notification, person);
	}

	/* Delete notification */
	@Delete(":id")
	delete(
		@Param("id") id: string,
		@RequestPerson() person: Person
	) {
		return this.notificationsService.delete(id, person);
	}
}
