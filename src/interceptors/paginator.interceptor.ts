import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { QueryWithPagingAndLangAndIdIn } from "src/common.dto";
import { pageResult } from "src/pagination.utils";
import { Request } from "express";
import { plainToClass } from "class-transformer";

@Injectable()
export class Paginator implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		return next.handle().pipe(map(result => this.paginate(request.query, result)));
	}

	paginate(rawQuery: QueryWithPagingAndLangAndIdIn, result: unknown[]) {
		const query = plainToClass(QueryWithPagingAndLangAndIdIn, rawQuery);
		const { page, pageSize, lang } = query;
		return pageResult(result, page, pageSize, lang);
	}
}
