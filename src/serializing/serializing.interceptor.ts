import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { excludePrivateProps } from "./serializing";
import { applyToResult } from "src/pagination";

@Injectable()
export class SerializingInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(map(result => applyToResult(result, excludePrivateProps)));
	}
}
