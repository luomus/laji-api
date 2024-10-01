import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { catchError, Observable, throwError } from "rxjs";

/**
 * Catches AxiosErrors where the request fails due to a error response, and rethrow it as an HttpException.
 */
@Injectable()
export class HttpClientErrorToHttpExceptionInterceptor implements NestInterceptor {

	logger = new Logger("HttpClientError");

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(
			catchError(e => {
				return throwError(() =>  {
					return (!(e instanceof HttpException) && e.response?.status)
						? new HttpException(e.response?.data  ?? "LajiApi generic error - External request failed",
							e.response?.status)
						: e;
				}
				);
			})
		);
	}
}
