import { MaybePromise } from "src/typing.utils";
import { Document } from "@luomus/laji-schema";
import { ValidationErrorFormat } from "../documents.dto";
import { LocalizedException, isJSONPointer } from "src/utils";
import * as translations from "src/translations.json";

export const joinJSONPointers = (path: string | undefined, subpath: string) => {
	if (!isJSONPointer(subpath)) {
		throw new Error(`Bad JSON pointer: ${subpath}`);
	}
	if (path === undefined || !path.length) {
		return subpath;
	}
	return path + subpath;
};

export abstract class DocumentValidator<T = Document> {
	abstract validate(
		document: T,
		path: string | undefined,
		options: any
	): MaybePromise<void>;
}

export class ErrorsObj { [path: string]: ErrorsObj | string[] };
export type ValidationDetails = { [jsonPointer: string]: (keyof typeof translations)[] }

/**
 * Not to be instantialized directly. Use LocalizedValidationException or PreLocalizedDetailsValidationException instead.
 * This is used in the filter to detect all sub-types of validation exceptions.
 * */
export abstract class ValidationExceptionBase extends LocalizedException {
	abstract details: ValidationDetails | { [jsonPointer: string]: string[] };
	constructor() {
		super("VALIDATION_EXCEPTION", 422);
	}
}

export class ValidationException extends ValidationExceptionBase {
	details: ValidationDetails;
	constructor(details: ValidationDetails) {
		super();
		this.details = details;
	}
}

export class PreTranslatedDetailsValidationException extends ValidationExceptionBase {
	details: { [jsonPointer: string]: string[] };
	constructor(details: { [jsonPointer: string]: string[] }) {
		super();
		this.details = details;
	}
}

export const isValidationExceptionBase = (e: any): e is ValidationExceptionBase => !!e?.details;

const jsonPointerFormatToObjectFormat = (errors: Record<string, string[]>) =>
	Object.keys(errors).reduce((result, path) => {
		const parts = path.split(/\//).filter(value => value !== "");
		const last = parts.pop() as string;
		let pointer = result;
		parts.forEach(part => {
			if (!pointer[part]) {
				pointer[part] = {};
			}
			pointer = pointer[part] as ErrorsObj;
		});
		pointer[last] = errors[path]!;
		return result;
	}, {} as ErrorsObj);

export const JSONPointerToOldApiJSONPath = (pointer: string) => {
	const splits = pointer.split("/");
	splits.shift();
	return splits.reduce((path, item) => {
		if (!isNaN(+item)) {
			return path + `[${item}]`;
		}
		return path + `.${item}`;
	}, "");
};

const jsonPointerFormatToJsonPathFormat = (errors: Record<string, string[]>) =>
	Object.keys(errors).reduce((result, path) => {
		result[JSONPointerToOldApiJSONPath(path)] = errors[path] as string[];
		return result;
	}, {} as Record<string, string[]>);

export const formatErrorDetails = (
	errors: Record<string, string[]>,
	targetType: ValidationErrorFormat = ValidationErrorFormat.jsonPointer
) => {
	switch (targetType) {
	case "jsonPointer":
		return errors;
	case "dotNotation":
	// Inherited from the old API. It's not really JSON path but dot notation. Should be removed.
	case "jsonPath":
		return jsonPointerFormatToJsonPathFormat(errors);
	default:
		return jsonPointerFormatToObjectFormat(errors);
	}
};
