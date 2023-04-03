import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from "@nestjs/common";
import { catchError, Observable, throwError } from "rxjs";

/*
 * Catches AxiosErrors where the request fails due to a error response, and rethrow it as an HttpException.
 */
@Injectable()
export class HttpClientErrorToHttpExceptionInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(catchError(e =>  {
			return throwError(() => 
				(!(e instanceof HttpException) && e.response?.data && e.response?.status)
					? new HttpException(e.response?.data as any, e.response?.status)
					: e)
		}
		));
	}
}
