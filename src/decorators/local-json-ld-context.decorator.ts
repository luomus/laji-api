import { Newable } from "src/typing.utils";

export const LOCAL_JSON_LD_CONTEXT_METADATA_KEY = Symbol();

export const localJsonLdContextToClass: Record<string, Newable<any>> = {};

export function LocalJsonLdContext(context: string) {
	return function <T extends Newable<any>>(target: T) {
		Reflect.defineMetadata(LOCAL_JSON_LD_CONTEXT_METADATA_KEY, context, target);
		localJsonLdContextToClass[context] = target;
		return target;
	};
}
