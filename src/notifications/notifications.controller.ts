import { Body, Controller, Delete, Get, Param, Put, Query } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { QueryWithPersonTokenDto } from "src/common.dto";
import { GetPageDto, Notification } from "./notification.dto";
import { NotificationsService } from "./notifications.service";
import {SwaggerRemote, SwaggerRemoteRef} from "src/swagger/swagger-remote.decorator";

@SwaggerRemote()
@ApiSecurity("access_token")
@Controller("notifications")
@ApiTags("Notifications")
export class NotificationsController {
	constructor(private notificationsService: NotificationsService) {}
	/*
	 * Get notifications
	 */
	@Get(":personToken")
	@SwaggerRemoteRef({ source: "store", ref: "notification" })
	getAll(@Param("personToken") personToken: string, @Query() { page, pageSize, onlyUnSeen }: GetPageDto) {
		return this.notificationsService.getPage(personToken, onlyUnSeen, page, pageSize);
	}

	/*
	 * Update notification
	 */
	@Put(":id")
	@SwaggerRemoteRef({ source: "store", ref: "notification" })
	update(
		@Param("id") id: string,
		@Body() notification: Notification,
		@Query() { personToken }: QueryWithPersonTokenDto
	) {
		return this.notificationsService.update(id, notification, personToken);
	}

	/*
	 * Delete notification
	 */
	@Delete(":id")
	delete(
		@Param("id") id: string,
		@Query() { personToken }: QueryWithPersonTokenDto
	) {
		return this.notificationsService.delete(id, personToken);
	}
}
