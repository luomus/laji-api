import { CallHandler, ExecutionContext, Injectable, mixin, NestInterceptor } from "@nestjs/common";
import { from, Observable, switchMap } from "rxjs";
import { Request } from "express";
import { isQueryWithLangDto, QueryWithPagingDto, QueryWithLangDto, isQueryWithPagingDto, HasJsonLdContext }
	from "src/common.dto";
import { LangService } from "src/lang/lang.service";
import { promisePipe } from "src/utils";
import { paginateArray, applyToResult } from "src/pagination.utils";
import { Newable } from "src/typing.utils";
import { serializeInto as _serializeInto, SerializeOptions } from "src/serialization/serialization.utils";
import { plainToClass } from "class-transformer";
import { applyLangToJsonLdContext } from "src/json-ld/json-ld.utils";

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
			const selectedFields: string[] | undefined = (query as any).selectedFields?.split(",");
			const sample = isQueryWithLangDto(query)
				? Array.isArray(result)
					? result[0]
					: result
				: undefined;
			if (isQueryWithPagingDto(query)) {
				result = paginateArray(result, page, pageSize);
			}

			if (isQueryWithLangDto(query) && sample) {
				const jsonLdContext = sample["@context"];
				if (!jsonLdContext) {
					throw new Error("QueryParamsInterceptor failed to get the @context for item");
				}
				const translated = await applyToResult(
					await this.langService.contextualTranslateWith(jsonLdContext, lang, langFallback, selectedFields),
				)(result);
				return applyLangToJsonLdContext(translated as HasJsonLdContext, lang);
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
