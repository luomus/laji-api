import { MaybePromise } from "src/type-utils";
import { Document } from "@luomus/laji-schema";
import { HttpException } from "@nestjs/common";
import { ValidationErrorFormat } from "../documents.dto";
import { isJSONPointer } from "src/utils";

export const getPath = (path: string | undefined, subpath: string) => {
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

/** The `details` must be a map of JSON pointers and error message arrays. */
export class ValidationException extends HttpException {
	constructor(details: ErrorsObj) {
		// formatDetails(details);
		super({ statusCode: 422, message: "Unprocessable Entity", details }, 422);
	}
}

export const isValidationException = (e: any): e is ValidationException => !!e?.response?.details;

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
	}, {} as ErrorsObj);

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
