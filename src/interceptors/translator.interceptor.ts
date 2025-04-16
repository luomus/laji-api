import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { HasJsonLdContext, QueryWithLangDto } from "src/common.dto";
import { applyToResult, isPageLikeResult } from "src/pagination.utils";
import { Request } from "src/request";
import { plainToClass } from "class-transformer";
import { LangService } from "src/lang/lang.service";
import { applyLangToJsonLdContext } from "src/json-ld/json-ld.utils";

@Injectable()
export class Translator implements NestInterceptor {

	constructor(
		private langService: LangService
	) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		return next.handle().pipe(switchMap(result => this.translate(request.query, result)));
	}

	async translate(rawQuery: QueryWithLangDto, result: any) {
		const query = plainToClass(QueryWithLangDto, rawQuery);
		const { lang, langFallback } = query;
		const selectedFields: string[] | undefined = (query as any).selectedFields?.split(",");
		const sample = this.takeSample(result);

		if (!sample) {
			return result;
		}

		const jsonLdContext = this.getJsonLdContext(sample);

		if (!jsonLdContext) {
			throw new Error("Translator failed to get the @context for item");
		}

		const translated = await applyToResult(
			await this.langService.contextualTranslateWith(jsonLdContext, lang, langFallback, selectedFields),
		)(result);
		return typeof jsonLdContext === "string"
			? applyToResult(item => applyLangToJsonLdContext(item as HasJsonLdContext, lang))(translated)
			: translated;
	};

	private takeSample(result: any) {
		if (isPageLikeResult(result)) {
			return result.results[0];
		} else if (Array.isArray(result)) {
			return result[0];
		}
		return result;
	}

	private getJsonLdContext(sample: Record<string, unknown>) {
		if (!sample) {
			return undefined;
		}
		if (sample["@context"]) {
			return sample["@context"] as string;
		}
	}
}
