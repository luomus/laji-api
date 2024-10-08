import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable, catchError, tap, throwError } from "rxjs";
import { Request } from "src/request";
import { joinOnlyStrings } from "src/utils";

type TimeStampedRequest = Request & { lajiApiTimeStamp: number };

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
	logger = new Logger("IncomingRequest");

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<TimeStampedRequest>();
		request.lajiApiTimeStamp = Date.now();
		this.logger.verbose(`START ${stringifyRequest(request, false)}`);
		return next.handle().pipe(
			catchError(e => {
				this.logger.error(`END ${stringifyRequest(request)}`, { body: request.body });
				return throwError(e);
			}),
			tap(() => {
				this.logger.verbose(`END ${stringifyRequest(request)}`);
			})
		);
	}
}

const stringifyRequest = (request: TimeStampedRequest, timestamp = true) => {
	const userId = request.person?.id;
	const { apiUser } = request;
	return joinOnlyStrings(
		`${request.method} ${request.url}`,
		timestamp && `[${Date.now() - request.lajiApiTimeStamp}ms]`,
		userId && `[${userId}]`,
		apiUser?.systemID && `[${apiUser.systemID}]`
	);
};
