declare namespace lajiValidate {
	import Validator from "src/luomus/forms/forms.dto";
	import { JSONObjectSerializable } from "src/type-utils";

	function async(data: JSONObjectSerializable, validators: Validator): Promise<void>;

	function extend(validator: unknown, options: unknown): void;

	const validators = { remote: unknown };
}

declare module "@luomus/laji-validate" {
	export = lajiValidate;
}

declare namespace validators {
	function geometry(geometry: any): string | undefined;
}

declare module "@luomus/laji-validate/dist/validators" {
	export = validators
}
