import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { applyToResult } from "src/pagination.utils";
import { instanceToPlain } from "class-transformer";

@Injectable()
export class InstanceToPlainInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(switchMap(async result => {
			// instanceToPlain so DTO getters are serialized into plain values. https://github.com/typestack/class-transformer/issues/1060
			return applyToResult(instanceToPlain)(result);
		}));
	}
}
