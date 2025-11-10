import { ArgumentsHost, Catch } from "@nestjs/common";
import { ValidationExceptionBase, formatErrorDetails } from "../document-validator/document-validator.utils";
import { Request } from "express";
import { ValidationErrorFormat } from "../documents.dto";
import { localizeException } from "src/filters/localize-exception.filter";
import { ErrorSignatureBackwardCompatibilityFilter } from "src/filters/error-signature-backward-compatibility.filter";
import { getLang } from "src/interceptors/translator.interceptor";

@Catch(ValidationExceptionBase)
export class ValidatiorErrorFormatFilter extends ErrorSignatureBackwardCompatibilityFilter<ValidationExceptionBase> {

	catch(e: ValidationExceptionBase, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const request = ctx.getRequest<Request>();
		const { validationErrorFormat = "object" } = request.query;
		const lang = getLang(request);

		localizeException(e, lang);
		(e as any).details = formatErrorDetails(
			(e as any).details,
			validationErrorFormat as ValidationErrorFormat
		);
		super.catch(e, host);
	}
}
