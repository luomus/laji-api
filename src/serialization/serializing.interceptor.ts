import { CallHandler, ExecutionContext, Injectable, NestInterceptor, mixin } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { SerializeOptions, serializeInto as _serializeInto } from "./serialization.utils";
import { applyToResult } from "src/pagination.utils";
import { Newable } from "src/typing.utils";

export function createNewSerializingInterceptorWith(serializeInto?: Newable<any>, serializeOptions?: SerializeOptions) {
	@Injectable()
	class SerializingInterceptor implements NestInterceptor {
		intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
			return next.handle().pipe(switchMap(async result => {
				if (serializeInto) {
					result = await applyToResult(_serializeInto(serializeInto, serializeOptions))(result);
				}
				return result;
			}));
		}
	}
	return mixin(SerializingInterceptor) as any;
}
export const SerializingInterceptor = createNewSerializingInterceptorWith();
