import { CallHandler, ExecutionContext, Injectable, NestInterceptor, mixin } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { SerializeOptions, serializeInto as _serializeInto } from "./serialization.utils";
import { applyToResult } from "src/pagination.utils";
import { Newable } from "src/typing.utils";

export function Serializer(
	serializeInto: Newable<any>,
	serializeOptions?: SerializeOptions
) {
	@Injectable()
	class Serializer implements NestInterceptor {
		intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
			return next.handle().pipe(switchMap(applyToResult(
				_serializeInto(serializeInto, serializeOptions)
			)));
		}
	}
	return mixin(Serializer) as any;
}

