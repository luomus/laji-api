import { MaybePromise } from "src/typing.utils";

export abstract class AbstractAutocompleteService<T extends Record<string, unknown> | undefined> {
	abstract autocomplete(query: string | undefined, params: T): MaybePromise<unknown>;
}

