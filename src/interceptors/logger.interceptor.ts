import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable, catchError, tap, throwError } from "rxjs";
import { Request } from "src/request";

type TimeStampedRequest = Request & { lajiApiTimeStamp: number };

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
	logger = new Logger("IncomingRequest");

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<TimeStampedRequest>();
		const timestamp = Date.now();
		request.lajiApiTimeStamp = timestamp;
		this.logger.verbose(`START ${stringifyRequest(request)}`);
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

const stringifyRequest = (request: TimeStampedRequest) => {
	const userId = request.person?.id;
	const msg = [
		`${request.method} ${request.url}`,
		`[${Date.now() - request.lajiApiTimeStamp}ms]`,
		userId && `[${userId}]`].filter(m => typeof m === "string");
	return msg.join(" ");
};