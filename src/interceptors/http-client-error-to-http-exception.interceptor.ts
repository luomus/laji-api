import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { catchError, Observable, throwError } from "rxjs";
import { ExternalException } from "src/utils";

/**
 * Catches AxiosErrors where the request fails due to a error response, and rethrow it as an HttpException.
 */
@Injectable()
export class HttpClientErrorToHttpExceptionInterceptor implements NestInterceptor {

	logger = new Logger("HttpClientError");

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(
			catchError(e =>
				throwError(() => {
					return (!(e instanceof HttpException) && e.response?.status)
						? new ExternalException(
							e.response?.data || "Outgoing request failed without message",
							e.response?.status
						)
						: e;
				})
			)
		);
	}
}
