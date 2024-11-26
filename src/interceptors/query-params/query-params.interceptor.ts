import { CallHandler, ExecutionContext, Injectable, mixin, NestInterceptor } from "@nestjs/common";
import { from, Observable, switchMap } from "rxjs";
import { Request } from "express";
import { isQueryWithLangDto, QueryWithPagingDto, QueryWithLangDto, isQueryWithPagingDto } from "src/common.dto";
import { LangService } from "src/lang/lang.service";
import { promisePipe } from "src/utils";
import { pageResult, applyToResult } from "src/pagination.utils";
import { Newable } from "src/typing.utils";
import { serializeInto as _serializeInto, SerializeOptions } from "src/serialization/serialization.utils";
import { plainToClass } from "class-transformer";

/**
 * Creates an interceptor that handles applying the paging and language related query params to the result.
 * @param QueryDto The DTO class of the query. Formatting the response to be correctly translated and paged depends on the DTO class having 'page', 'pageSize' and 'lang' props.
 * @param serializeInto Serialize the result item(s) into a class.
 * @param serializeOptions Options for serialization.
 */
export function createQueryParamsInterceptor<T extends (Partial<QueryWithLangDto> & Partial<QueryWithPagingDto>)>
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
				promisePipe(
					this.handleQuery(request.query),
					applyToResult(serialize)
				)(result)
			)));
		}

		handleQuery = (rawQuery: Partial<typeof QueryDto>) => async (result: any): Promise<any> => {
			if (!QueryDto) {
				return result;
			}

			const query = plainToClass(QueryDto, rawQuery);
			const { lang, langFallback, page, pageSize } = query;
			let context: string | undefined;
			if (isQueryWithLangDto(query)) {
				if (Array.isArray(result)) {
					context = result[0]?.["@context"];
				} else {
					context = result["@context"];
				}
			}
			if (isQueryWithPagingDto(query)) {
				result = pageResult(result, page, pageSize, lang);
			}
			if (isQueryWithLangDto(query)) {
				if (!context) {
					throw new Error("QueryParamsInterceptor failed to get the @context for item");
				}
				return applyToResult(
					await this.langService.contextualTranslateWith(context, lang, langFallback)
				)(result);
			}
			return result;
		};
	}

	function serialize(result: any) {
		return serializeInto
			? _serializeInto(serializeInto, serializeOptions)(result)
			: result;
	}

	return mixin(QueryParamsInterceptor) as any;
}
