import { CallHandler, ExecutionContext, Injectable, NestInterceptor, mixin } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { SerializeOptions, serializeInto as _serializeInto } from "./serialization.utils";
import { applyToResult } from "src/pagination.utils";
import { Newable } from "src/typing.utils";
import { pipe } from "src/utils";
import { addLocalJsonLdContext } from "src/json-ld/json-ld.utils";

export function Serializer(
	serializeInto: Newable<any>,
	serializeOptions?: SerializeOptions & { localJsonLdContext?: string }
) {
	@Injectable()
	class Serializer implements NestInterceptor {
		intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
			return next.handle().pipe(switchMap(applyToResult(
				pipe(
					_serializeInto(serializeInto, serializeOptions),
					addMetadata(serializeOptions?.localJsonLdContext),
					addLocalJsonLdContext(serializeOptions?.localJsonLdContext)
				)
			)));
		}
	}
	return mixin(Serializer) as any;
}

export const LOCAL_JSON_LD_CONTEXT_METADATA_KEY = Symbol();

export const localJsonLdContextToClass: Record<string, Newable<any>> = {};

const addMetadata = (localJsonLdContext?: string) => (item: any) => {
	if (!localJsonLdContext) {
		return item;
	}
	Reflect.defineMetadata(LOCAL_JSON_LD_CONTEXT_METADATA_KEY, localJsonLdContext, item.constructor);
	localJsonLdContextToClass[localJsonLdContext] = item.constructor;
	return item;
};
