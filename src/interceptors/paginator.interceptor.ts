import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { QueryWithPagingAndLangAndIdIn, QueryWithPagingDto } from "src/common.dto";
import { paginateArray } from "src/pagination.utils";
import { Request } from "express";
import { plainToClass } from "class-transformer";

@Injectable()
export class Paginator implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		return next.handle().pipe(map(result => paginate(request.query, result)));
	}
}

const paginate = (rawQuery: QueryWithPagingAndLangAndIdIn, result: any[]) => {
	const query = plainToClass(QueryWithPagingDto, rawQuery);
	const { page, pageSize } = query;
	return paginateArray(result, page, pageSize);
};
