import { ArgumentsHost, Catch, HttpException } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { Request, Response } from "express";
import { JSONObjectSerializable } from "src/typing.utils";
import { ExternalException } from "src/utils";

/** Maintain backward compatibility of the error signature of the old API. */
@Catch()
export class ErrorSignatureBackwardCompatibilityFilter<T extends Error> extends BaseExceptionFilter<T> {
	catch(exception: T, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const request = ctx.getRequest<Request>();
		const response = ctx.getResponse<Response>();
		const status = exception instanceof HttpException
			? exception.getStatus()
			: 500;
		let json: JSONObjectSerializable;
		if (typeof exception === "string") {
			json = { message: exception };
		} else if (exception instanceof ExternalException) {
			json = {
				errorCode: exception.errorCode,
				message: exception.message,
				...(exception.json || {}),
			}
		} else if ((exception as any).errorCode) {
			json = {
				message: exception.message,
				localized: !!(exception as any).localized,
				details: (exception as any).details,
				errorCode: (exception as any).errorCode,
			};
		} else if (exception instanceof HttpException) {
			json = {
				errorCode: "GENERIC",
				message: exception.message
			};
		} else {
			json = { errorCode: "GENERIC", message: exception.message };
		}
		const responseBody = {
			...json,
			error: request.headers?.["api-version"] === "1" ? undefined : json
		};

		response.status(status).json(responseBody);
		super.catch(exception, host); // Handles logging.
	}
}
