import { ArgumentsHost, Catch, HttpException, HttpStatus } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { Request, Response } from "express";

/** Maintain backward compatibility of the error signature of the old API. */
@Catch()
export class ErrorSignatureBackwardCompatibilityFilter<T> extends BaseExceptionFilter<T> {
	catch(exception: T, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const request = ctx.getRequest<Request>();
		if (request.headers?.["api-version"] === "1") {
			return super.catch(exception, host);
		}
		const response = ctx.getResponse<Response>();
		const status =
			      exception instanceof HttpException
		        ? exception.getStatus()
		        : HttpStatus.INTERNAL_SERVER_ERROR;
		const httpResponse = exception instanceof HttpException
			? exception.getResponse()
			: { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: "Internal server error" };

		const responseBody = {
			...(typeof httpResponse === "string" ? { message: httpResponse } : httpResponse),
			error: { ...(typeof httpResponse === "string" ? { message: httpResponse } : httpResponse) }
		};

		response.status(status).json(responseBody);
		super.catch(exception, host);
	}
}
