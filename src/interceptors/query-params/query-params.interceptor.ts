import { CallHandler, ExecutionContext, Injectable, mixin, NestInterceptor } from "@nestjs/common";
import { from, Observable, switchMap } from "rxjs";
import { Request } from "express";
import { isLangQueryDto, isPagedQueryDto, Lang, LangQueryDto, PagedDto } from "src/common.dto";
import { LangService } from "src/lang/lang.service";
import { applyToResult, pageResult, promisePipe } from "src/utils";
import { excludePrivateProps, Newable, serializeInto as _serializeInto, SerializeOptions } from "src/type-utils";
import { plainToClass } from "class-transformer";

/**
 * Creates an interceptor that handles applying the paging and language related query params to the result. 
 * @param QueryDto The DTO class of the query. Formatting the response to be correctly translated and paged depends on the DTO class having 'page', 'pageSize' and 'lang' props.
 * @param serializeInto Serialize the result item(s) into a class.
 * @param serializeOptions Options for serialization.
 */
export function createQueryParamsInterceptor<T extends (Partial<LangQueryDto> & Partial<PagedDto>)>
(QueryDto?: Newable<T>, serializeInto?: Newable<any>, serializeOptions?: SerializeOptions)
	: ClassDecorator {
	@Injectable()
	class QueryParamsInterceptor implements NestInterceptor {

		constructor(private langService: LangService) {
			this.handleQuery = this.handleQuery.bind(this);
		}

		intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
			const request = context.switchToHttp().getRequest<Request>();

			return next.handle().pipe(switchMap(result => from(
				promisePipe(result,
					this.handleQuery(request.query),
					result => applyToResult(result, this.serialize))
			)));
		}

		handleQuery = (rawQuery: Partial<typeof QueryDto>) => async (result: any): Promise<any> => {
			if (!QueryDto) {
				return result;
			}

			const query = plainToClass(QueryDto, rawQuery);
			const { lang, langFallback, page, pageSize } = query;
			let context;
			if (isLangQueryDto(query)) {
				if (Array.isArray(result)) {
					context = result[0]["@context"];
				} else {
					context = result["@context"];
				}
			}
			if (isPagedQueryDto(query)) {
				result = pageResult(result, page, pageSize, lang);
			}
			if (isLangQueryDto(query)) {
				return applyToResult(result, this.getTranslate(context, lang, langFallback));
			}
			return result;
		}

		private getTranslate(context: string, lang?: Lang, langFallback?: boolean) {
			return (result: any) => this.langService.translateWithContext(context)(result, lang, langFallback);
		}

		serialize(result: any) {
			return excludePrivateProps(serializeInto
				? _serializeInto(serializeInto, serializeOptions)(result)
				: result
			);
		}
	}

	return mixin(QueryParamsInterceptor) as any;
}
