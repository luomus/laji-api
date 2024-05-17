import { MaybePromise } from "src/type-utils";
import { Document } from "@luomus/laji-schema";
import { HttpException } from "@nestjs/common";

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

type ErrorLeaf = string[];
export type ErrorsObj = { [path: string]: ErrorsObj | ErrorLeaf };

export class ValidationException extends HttpException {
	constructor(details: ErrorsObj) {
		super({ statusCode: 422, message: "Unprocessable Entity", details }, 422);
	}
}


export const isValidationException = (e: any): e is ValidationException => !!e.response.details;
