import { Body, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { GetLoggerStatusDto, LogLevel } from "./logger.dto";
import { LoggerService } from "./logger.service";
import { JSONSerializable } from "src/typing.utils";
import { ApiUserEntity } from "src/api-users/api-user.entity";
import { ApiUser } from "src/decorators/api-user.decorator";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiBody, ApiParam, ApiTags } from "@nestjs/swagger";

@ApiTags("Logger")
@LajiApiController("logger")
export class LoggerController {
	constructor(private loggerService: LoggerService) {}

	/** Send a log event */
	@Post(":level")
	@HttpCode(204)
	@ApiParam({
		name: "level",
		enum: LogLevel,
		description: "Log level",
	})
	@ApiBody({
		schema: {
			type: "object",
			additionalProperties: true,
			example: { message: "log message", meta: {} },
		},
	})
	log(@Param("level") level: LogLevel, @Body() data: JSONSerializable, @ApiUser() apiUser: ApiUserEntity) {
		void this.loggerService.log(level, data, apiUser);
	}

	/** Get info if there's log events */
	@Get("status")
	@HttpCode(200)
	getStatus(@ApiUser() apiUser: ApiUserEntity, @Query() { minutesBack }: GetLoggerStatusDto) {
		return this.loggerService.getStatus(apiUser, minutesBack);
	}
}
