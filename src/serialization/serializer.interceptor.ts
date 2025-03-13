import { CallHandler, ExecutionContext, Injectable, NestInterceptor, mixin } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { SerializeOptions, serializeInto as _serializeInto } from "./serialization.utils";
import { applyToResult } from "src/pagination.utils";
import { Newable } from "src/typing.utils";
import { instanceToPlain } from "class-transformer";

export function Serializer(serializeInto?: Newable<any>, serializeOptions?: SerializeOptions) {
	@Injectable()
	class Serializer implements NestInterceptor {
		intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
			return next.handle().pipe(switchMap(async result => {
				if (serializeInto) {
					result = await applyToResult(_serializeInto(serializeInto, serializeOptions))(result);
				}
				// instanceToPlain so DTO getters are serialized into plain values. https://github.com/typestack/class-transformer/issues/1060
				return applyToResult(instanceToPlain)(result);
			}));
		}
	}
	return mixin(Serializer) as any;
}
