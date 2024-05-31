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

export class ValidationException extends HttpException {
	constructor(details: ErrorsObj) {
		super({ statusCode: 422, message: "Unprocessable Entity", details }, 422);
	}

	getDetails() {
		const response = this.getResponse();
		if (typeof response === "string") {
			throw new Error("Weird ValidationException, 'response' should be an object, not a string");
		}
		return (response as any).details;
	}
}


export const isValidationException = (e: any): e is ValidationException => !!e?.response?.details;

const errorsToObj = (errors: Record<string, string[]>) =>
	Object.keys(errors).reduce((result, path) => {
		const parts = path.split(/[.\[\]]/).filter(value => value !== "");
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

export const formatErrorDetails = (errors: Record<string, string[]>, targetType: ValidationErrorFormat) => {
	switch (targetType) {
	case "jsonPath":
		return errors;
	default:
		return errorsToObj(errors);
	}
};

