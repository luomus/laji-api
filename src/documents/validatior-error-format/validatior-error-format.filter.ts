import { ArgumentsHost, Catch, HttpException } from "@nestjs/common";
import { ValidationExceptionBase, formatErrorDetails } from "../document-validator/document-validator.utils";
import { Request } from "express";
import { ValidationErrorFormat } from "../documents.dto";
import { localizeException } from "src/filters/localize-exception.filter";
import { ErrorSignatureBackwardCompatibilityFilter } from "src/filters/error-signature-backward-compatibility.filter";
import { getLang } from "src/interceptors/translator.interceptor";

@Catch(ValidationExceptionBase)
export class ValidatorErrorFormatFilter extends ErrorSignatureBackwardCompatibilityFilter<ValidationExceptionBase> {

	catch(e: ValidationExceptionBase, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const request = ctx.getRequest<Request>();
		const { validationErrorFormat } = request.query;
		const lang = getLang(request);
		const apiVersion = request.headers["api-version"];
		if (apiVersion === "1" && validationErrorFormat) {
			throw new HttpException(
				// eslint-disable-next-line max-len
				"'validationErrorFormat' query parameter is deprecated for API v1. Error format is JSON pointer format always.",
				422
			);
		}

		localizeException(e, lang);
		(e as any).details = formatErrorDetails(
			(e as any).details,
			validationErrorFormat as ValidationErrorFormat || apiVersion === "1"
				? ValidationErrorFormat.jsonPointer
				: ValidationErrorFormat.object
		);
		super.catch(e, host);
	}
}
