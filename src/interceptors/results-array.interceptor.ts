import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { QueryWithLangDto } from "src/common.dto";
import { addContextToPageLikeResult } from "src/pagination.utils";
import { Request } from "express";
import { plainToClass } from "class-transformer";

@Injectable()
export class ResultsArray implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		return next.handle().pipe(map(result => toResultsArray(request.query, result)));
	}
}

const toResultsArray = (rawQuery: QueryWithLangDto, results: any[]) => {
	const query = plainToClass(QueryWithLangDto, rawQuery);
	const { lang } = query;
	return addContextToPageLikeResult(lang)({ results });
};
