import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { ValidationException, formatErrorDetails } from "../document-validator/document-validator.utils";
import { Request, Response } from "express";
import { ValidationErrorFormat } from "../documents.dto";
import { BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";

@Catch(ValidationException)
export class ValidatiorErrorFormatFilter<T> extends BaseExceptionFilter {

	catch(e: T, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const request = ctx.getRequest<Request>();
		const response = ctx.getResponse<Response>();
		const { validationErrorFormat = "object" } = request.query;
		// throw new ValidationException(
		// 	formatErrorDetails((e as any).response.details, validationErrorFormat as ValidationErrorFormat)
		// );

		console.log((e as any).response.details);
		console.log(formatErrorDetails(
			(e as any).response.details,
			validationErrorFormat as ValidationErrorFormat
		));
		(e as any).response.details = formatErrorDetails(
			(e as any).response.details,
			validationErrorFormat as ValidationErrorFormat
		);
		super.catch(e, host);
		// this.httpAdapterHost.httpAdapter.reply(ctx.getResponse(), e.getStatus());
		// response.
	}
}
