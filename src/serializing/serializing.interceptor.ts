import { CallHandler, ExecutionContext, Injectable, NestInterceptor, mixin } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { SerializeOptions, excludePrivateProps, serializeInto as _serializeInto } from "./serializing";
import { applyToResult } from "src/pagination";
import { Newable } from "src/type-utils";
import { instanceToPlain } from "class-transformer";
import { promisePipe } from "src/utils";

export function createNewSerializingInterceptorWith(serializeInto?: Newable<any>, serializeOptions?: SerializeOptions) {
	@Injectable()
	class SerializingInterceptor implements NestInterceptor {
		intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
			return next.handle().pipe(switchMap(async result => {
				if (serializeInto) {
					result = await applyToResult(_serializeInto(serializeInto, serializeOptions))(result);
				}
				// instanceToPlain so DTO getters are serialized into plain values. https://github.com/typestack/class-transformer/issues/1060
				return applyToResult(promisePipe(excludePrivateProps, instanceToPlain))(result);
			}));
		}
	}
	return mixin(SerializingInterceptor) as any;
}
export const SerializingInterceptor = createNewSerializingInterceptorWith();
