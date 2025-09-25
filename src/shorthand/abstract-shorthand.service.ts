import { MaybePromise } from "src/typing.utils";

export abstract class AbstractShorthandService<T extends Record<string, unknown> | undefined> {
	abstract shorthand(query: string | undefined, params: T): MaybePromise<unknown>;
}

