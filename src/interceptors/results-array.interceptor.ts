import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { addContextToPageLikeResult } from "src/pagination.utils";

@Injectable()
export class ResultsArray implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(map(result => toResultsArray(result)));
	}
}

const toResultsArray = (results: any[]) => {
	return addContextToPageLikeResult({ results });
};
