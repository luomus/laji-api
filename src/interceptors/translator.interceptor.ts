import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { HasSelectedFields } from "src/common.dto";
import { applyToResult, isPageLikeResult } from "src/pagination.utils";
import { Request } from "src/request";
import { plainToClass } from "class-transformer";
import { LangService } from "src/lang/lang.service";
import { applyLangToJsonLdContext, getJsonLdContextFromSample } from "src/json-ld/json-ld.utils";
import { getLangPreferences, LangPreference } from "src/lang/lang.utils";

/** Translates the response according to a JSON-LD context */
@Injectable()
export class Translator implements NestInterceptor {

	constructor(
		private langService: LangService
	) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		return next.handle().pipe(switchMap(result => this.translate(request, result)));
	}

	async translate(request: Request, result: any) {
		if (!result
			|| (result instanceof Array && !result.length)
			|| isPageLikeResult(result) && !result.results.length
		) {
			return result;
		}

		const jsonLdContext = result["@context"] || getJsonLdContextFromSample(takeSample(result));

		if (!jsonLdContext) {
			throw new Error("Translator failed to get the @context for item");
		}

		const langPreferences = getLangPreferences(request);
		console.log(langPreferences);
		const { selectedFields } = plainToClass(HasSelectedFields, request.query);

		const translated = await applyToResult(
			await this.langService.contextualTranslateWith(jsonLdContext, langPreferences, selectedFields),
		)(result);

		return this.applyLangToJsonLdContext(translated, langPreferences);
	};

	private applyLangToJsonLdContext(result: any, langPreferences: LangPreference[]) {
		if (result["@context"]) {
			return applyLangToJsonLdContext(result, langPreferences);
		}
		return typeof getJsonLdContextFromSample(takeSample(result)) === "string"
			? applyToResult(item =>
				applyLangToJsonLdContext(item as any, langPreferences))(result)
			: result;
	}
}

const takeSample = (result: any) => {
	if (isPageLikeResult(result)) {
		return result.results[0];
	} else if (Array.isArray(result)) {
		return result[0];
	}
	return result;
};
