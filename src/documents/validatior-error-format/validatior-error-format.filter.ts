import { ArgumentsHost, Catch } from "@nestjs/common";
import { ErrorsObj, ValidationException, formatErrorDetails } from "../document-validator/document-validator.utils";
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
		wrapDetails((e as any).response.details);
		super.catch(e, host);
	}
}


// TODO after prod release remove formatting.
/**
 * Errors are in this format originally:
 *
 * { "/formID": ["Missing required param formID"] }.
 *
 * This function transforms them to be like this:
 *
 * { "/formID": { errors: ["Missing required param formID"] } }.
 *
 * Transformation is done mutably.
 */
const wrapDetails = (details: ErrorsObj | string[]) => {
	if (details instanceof Array) {
		return { errors: details };
	} else {
		Object.keys(details).forEach(k => {
			details[k] = wrapDetails(details[k] as ErrorsObj | string[]);
		});
		return details;
	}
};
