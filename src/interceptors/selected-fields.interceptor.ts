import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { applyToResult } from "src/pagination.utils";
import { Request } from "src/request";
import { pickForKeys } from "src/typing.utils";

@Injectable()
export class SelectedFieldsInterceptor implements NestInterceptor {

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		const selectedFields = request.query.selectedFields as (string | undefined);
		if (!selectedFields) {
			return next.handle();
		}
		const splittedSelectedFields = selectedFields.split(",");
		return next.handle().pipe(map(applyToResult(pickForKeys(...splittedSelectedFields))));
	}

}
