import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { excludeDecoratedProps } from "src/type-utils";

@Injectable()
export class SerializingInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(map(excludeDecoratedProps));
	}
}