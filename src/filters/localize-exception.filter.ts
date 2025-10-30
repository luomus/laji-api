import { Catch, ArgumentsHost } from "@nestjs/common";
import { getLang } from "src/interceptors/translator.interceptor";
import { Request } from "src/request";
import { LocalizedException } from "src/utils";
import * as translations from "src/translations.json";
import { ErrorSignatureBackwardCompatibilityFilter }
	from "src/filters/error-signature-backward-compatibility.filter";
import { ValidationException } from "src/documents/document-validator/document-validator.utils";

@Catch(LocalizedException)
export class LocalizerExceptionFilter extends ErrorSignatureBackwardCompatibilityFilter<LocalizedException> {

	catch(exception: LocalizedException, host: ArgumentsHost) {
		localizeException(exception, host);
		super.catch(exception, host);
	}
}

export const localizeException = (exception: LocalizedException, host: ArgumentsHost) => {
	const ctx = host.switchToHttp();
	const request = ctx.getRequest<Request>();
	const lang = getLang(request);
	const errorCode = exception.errorCode;
	let localizedMessage = (translations as any)[errorCode]?.[lang] || errorCode;
	const { context } = exception;
	if (context) {
		const keys = Object.keys(context);
		keys.forEach(key => {
			localizedMessage = localizedMessage.replace(`\$\{${key}\}`, context[key]);
		});
	}
	exception.message = localizedMessage;
	if (exception instanceof ValidationException) {
		(exception as any).details = Object.keys(exception.details).reduce((translatedDetails, path) => {
			translatedDetails[path] = exception.details[path]!.map(errorCode => {
				return (translations as any)[errorCode as any]?.[lang] || errorCode;
			});
			return translatedDetails;
		}, {} as Record<string, string[]>);
	}
};
