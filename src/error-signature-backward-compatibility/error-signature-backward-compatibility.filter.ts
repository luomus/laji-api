import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from "express";

/** Maintain backward compatibility of the error signature of the old API. */
@Catch()
export class ErrorSignatureBackwardCompatibilityFilter<T> implements ExceptionFilter<T> {
	catch(exception: T, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
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
	}
}
