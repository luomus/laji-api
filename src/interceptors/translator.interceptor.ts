import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { HasSelectedFields, LANGS_WITH_MULTI, Lang } from "src/common.dto";
import { applyToResult, isPageLikeResult } from "src/pagination.utils";
import { Request } from "src/request";
import { plainToClass } from "class-transformer";
import { LangService } from "src/lang/lang.service";
import { applyLangToJsonLdContext, getJsonLdContextFromSample } from "src/json-ld/json-ld.utils";
import { firstFromNonEmptyArr } from "src/utils";

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

		const lang = getLang(request);
		const { selectedFields } = plainToClass(HasSelectedFields, request.query);

		const translated = await applyToResult(
			await this.langService.contextualTranslateWith(jsonLdContext, lang, selectedFields),
		)(result);

		return this.applyLangToJsonLdContext(translated, lang);
	};


	private applyLangToJsonLdContext(result: any, lang?: Lang) {
		if (result["@context"]) {
			return applyLangToJsonLdContext(result, lang);
		}
		return typeof getJsonLdContextFromSample(takeSample(result)) === "string"
			? applyToResult(item => applyLangToJsonLdContext(item as any, lang))(result)
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

export const getLang = (request: Request, allowMulti = true): Lang => {
	const { query, headers } = request;
	if (query.lang) {
		return parseLangFromQuery(query.lang as string);
	}
	const acceptLanguage = headers["accept-language"];
	if (acceptLanguage) {
		return parseLangFromHeader(acceptLanguage, allowMulti);
	}
	return Lang.en;
};

const parseLangFromQuery = (lang: string) => {
	const validLang = LANGS_WITH_MULTI.find(l => lang === l);
	if (!validLang) {
		throw new HttpException(`Unknown lang query parameter ${lang}`, 422);
	}
	return validLang;
};

const parseLangFromHeader = (acceptLanguage: string, allowMulti = true): Lang => {
	const lang = firstFromNonEmptyArr(acceptLanguage.split(",")).toLowerCase();
	if (lang.startsWith("fi")) {
		return Lang.fi;
	} else if (lang.startsWith("sv")) {
		return Lang.sv;
	} else if (allowMulti && lang.startsWith("mul")) {
		return Lang.multi;
	}
	return Lang.en;
};
