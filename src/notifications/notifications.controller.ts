import { Body, Delete, Get, Param, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { QueryWithPersonTokenDto } from "src/common.dto";
import { QueryWithPagingAndLangAndIdIn } from "./notification.dto";
import { Notification } from "@luomus/laji-schema";
import { NotificationsService } from "./notifications.service";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";

@LajiApiController("notifications")
@ApiTags("Notifications")
export class NotificationsController {
	constructor(private notificationsService: NotificationsService) {}

	/* Get notifications */
	@Get(":personToken")
	@SwaggerRemoteRef({ source: "store", ref: "notification" })
	getAll(
		@Query() { page, pageSize, onlyUnSeen }: QueryWithPagingAndLangAndIdIn,
		@Param("personToken") personToken: string,
		@PersonToken() person: Person
	) {
		return this.notificationsService.getPage(person, onlyUnSeen, page, pageSize);
	}

	/* Update notification */
	@Put(":id")
	@SwaggerRemoteRef({ source: "store", ref: "notification" })
	update(
		@Param("id") id: string,
		@Body() notification: Notification & { id: string },
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person
	) {
		return this.notificationsService.update(id, notification, person);
	}

	/* Delete notification */
	@Delete(":id")
	delete(
		@Param("id") id: string,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person
	) {
		return this.notificationsService.delete(id, person);
	}
}
