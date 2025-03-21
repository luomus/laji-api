import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { addContextToPageLikeResult } from "src/pagination.utils";

@Injectable()
export class ResultsArray implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(map(toResultsArray));
	}
}

const toResultsArray = (results: any[]) => addContextToPageLikeResult({ results });
