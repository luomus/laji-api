import { ArgumentsHost, Catch } from "@nestjs/common";
import { ValidationExceptionBase, formatErrorDetails } from "../document-validator/document-validator.utils";
import { Request } from "express";
import { ValidationErrorFormat } from "../documents.dto";
import { LocalizerExceptionFilter, localizeException } from "src/filters/localize-exception.filter";
import { ErrorSignatureBackwardCompatibilityFilter } from "src/filters/error-signature-backward-compatibility.filter";

@Catch(ValidationExceptionBase)
export class ValidatiorErrorFormatFilter extends ErrorSignatureBackwardCompatibilityFilter<ValidationExceptionBase> {

	catch(e: ValidationExceptionBase, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const request = ctx.getRequest<Request>();
		const { validationErrorFormat = "object" } = request.query;

		localizeException(e, host);
		(e as any).details = formatErrorDetails(
			(e as any).details,
			validationErrorFormat as ValidationErrorFormat
		);
		super.catch(e, host);
	}
}
