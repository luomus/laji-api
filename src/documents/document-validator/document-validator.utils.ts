import { MaybePromise } from "src/type-utils";
import { Document } from "@luomus/laji-schema";
import { HttpException } from "@nestjs/common";
import { ValidationErrorFormat } from "../documents.dto";

export const getPath = (path: string | undefined, subpath: string) => {
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

/**
 * Errors are in this format originally:
 *
 * { "/formID": ["Missing required param formID"] }.
 *
 * This function transforms them to be like this:
 *
 * { "/formID": { errors: ["Missing required param formID"] } }.
 *
 * Transformation is done mutably.
 */
const formatDetails = (details: ErrorsObj | string[]) => {
	if (details instanceof Array) {
		return { errors: details };
	} else {
		Object.keys(details).forEach(k => {
			details[k] = formatDetails(details[k] as ErrorsObj | string[]);
		});
		return details;
	}
};

export class ValidationException extends HttpException {
	constructor(details: ErrorsObj) {
		formatDetails(details);
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

export const formatErrorDetails = (
	errors: Record<string, string[]>,
	targetType: ValidationErrorFormat = ValidationErrorFormat.jsonPointer
) => {
	switch (targetType) {
	case "jsonPointer":
		return errors;
	default:
		return jsonPointerFormatToObjectFormat(errors);
	}
};
