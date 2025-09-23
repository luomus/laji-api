import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { HasSelectedFields } from "src/common.dto";
import { applyToResult } from "src/pagination.utils";
import { Request } from "express";
import { plainToClass } from "class-transformer";
import { pickForKeys } from "src/typing.utils";

@Injectable()
export class SelectedFields implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		const query = plainToClass(HasSelectedFields, request.query);
		const { selectedFields } = query;
		if (!selectedFields?.length) {
			return next.handle();
		}
		return next.handle().pipe(switchMap(applyToResult(pickForKeys(...selectedFields))));
	}
}
