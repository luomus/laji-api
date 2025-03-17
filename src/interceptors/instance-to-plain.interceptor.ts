import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { applyToResult } from "src/pagination.utils";
import { instanceToPlain } from "class-transformer";

// instanceToPlain is applied globally  so that DTO getters are serialized into plain values.
// https://github.com/typestack/class-transformer/issues/1060
@Injectable()
export class InstanceToPlainInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(switchMap(applyToResult(instanceToPlain)));
	}
}
