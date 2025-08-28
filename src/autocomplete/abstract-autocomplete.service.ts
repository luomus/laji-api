import { MaybePromise } from "src/typing.utils";
import { GetUnitDto } from "./autocomplete.dto";

export abstract class AbstractAutocompleteService<T extends Record<string, unknown> | undefined> {
	abstract autocomplete(query: string | undefined, params: T): MaybePromise<unknown>;
}

