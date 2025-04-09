import { ArgumentsHost, Catch } from "@nestjs/common";
import { ValidationException, formatErrorDetails } from "../document-validator/document-validator.utils";
import { Request } from "express";
import { ValidationErrorFormat } from "../documents.dto";
import { ErrorSignatureBackwardCompatibilityFilter }
	from "src/error-signature-backward-compatibility/error-signature-backward-compatibility.filter";

@Catch(ValidationException)
export class ValidatiorErrorFormatFilter<T> extends ErrorSignatureBackwardCompatibilityFilter<T> {

	catch(e: T, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const request = ctx.getRequest<Request>();
		const { validationErrorFormat = "object" } = request.query;

		(e as any).response.details = formatErrorDetails(
			(e as any).response.details,
			validationErrorFormat as ValidationErrorFormat
		);
		super.catch(e, host);
	}
}
