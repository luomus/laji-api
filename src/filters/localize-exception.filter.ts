import { Catch, ArgumentsHost } from "@nestjs/common";
import { getLang } from "src/interceptors/translator.interceptor";
import { Request } from "src/request";
import { LocalizedException } from "src/utils";
import * as translations from "src/translations.json";
import { ErrorSignatureBackwardCompatibilityFilter }
	from "src/filters/error-signature-backward-compatibility.filter";
import { ValidationException } from "src/documents/document-validator/document-validator.utils";
import { Lang } from "src/common.dto";

@Catch(LocalizedException)
export class LocalizerExceptionFilter extends ErrorSignatureBackwardCompatibilityFilter<LocalizedException> {

	catch(exception: LocalizedException, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const request = ctx.getRequest<Request>();
		const lang = getLang(request);
		localizeException(exception, lang);
		super.catch(exception, host);
	}
}

export const localizeException = (exception: LocalizedException, lang: Lang) => {
	const errorCode = exception.errorCode;
	let localizedMessage = (translations as any)[errorCode]?.[lang];
	const { context } = exception;
	if (localizedMessage && context) {
		const keys = Object.keys(context);
		keys.forEach(key => {
			localizedMessage = localizedMessage.replace(`\$\{${key}\}`, context[key]);
		});
	}
	exception.message = localizedMessage;
	if (isValidationException(exception)) {
		(exception as any).details = Object.keys(exception.details).reduce((translatedDetails, path) => {
			translatedDetails[path] = exception.details[path]!.map(errorCode => {
				return (translations as any)[errorCode as any]?.[lang] || errorCode;
			});
			return translatedDetails;
		}, {} as Record<string, string[]>);
	}
	return exception;
};

const isValidationException = (e: any): e is ValidationException => e.details && !e.pretranslated;
