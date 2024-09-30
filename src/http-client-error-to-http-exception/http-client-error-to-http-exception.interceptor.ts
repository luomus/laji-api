import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { catchError, Observable, throwError } from "rxjs";
import { Request } from "express";

/**
 * Catches AxiosErrors where the request fails due to a error response, and rethrow it as an HttpException.
 */
@Injectable()
export class HttpClientErrorToHttpExceptionInterceptor implements NestInterceptor {

	logger = new Logger("HttpClientError");

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		return next.handle().pipe(catchError(e => {
			this.logger.error(e, {
				incomingRequestMethod: request.method,
				incomingRequest: request.url,
				incomingRequestBody: request.body,
				outgoingResponseStatus: e.response?.status,
				outgoingResponseBody: e.response?.body
			});
			return throwError(() =>  {
				return (!(e instanceof HttpException) && e.response?.status)
					? new HttpException(e.response?.data as any ?? "LajiApi generic error - External request failed",
						e.response?.status)
					: e;
			}
			);
		}
		));
	}
}
