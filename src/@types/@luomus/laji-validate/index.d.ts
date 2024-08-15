
declare namespace lajiValidate {
	import Validator from "src/luomus/forms/forms.dto";
	import { JSONObjectSerializable } from "src/type-utils";
	import type { Geometry } from "geojson";

	function async(data: JSONObjectSerializable, validators: Validator): Promise<void>;

	function extend(validator: unknown, options: unknown): void;

	export function geometry(geometry: Geometry, options?: {
		minDistanceWith?: Geometry,
		minDistance?: number
	}): string | undefined;

	const validators = { remote: unknown, geometry };
}

declare module "@luomus/laji-validate" {
	export = lajiValidate;
}
