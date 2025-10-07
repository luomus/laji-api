import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { addContextToPageLikeResult } from "src/pagination.utils";

@Injectable()
export class AddContextToPageLikeResult implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(map(addContextToPageLikeResult));
	}
}
