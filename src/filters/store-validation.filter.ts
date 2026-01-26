import { ArgumentsHost, Catch } from "@nestjs/common";
import { AxiosError } from "axios";
import { PreTranslatedDetailsValidationException } from "src/documents/document-validator/document-validator.utils";
import { firstFromNonEmptyArr } from "src/utils";
import { AxiosErrorFilter } from "./axios-error.filter";

/** Translates store validation errors into ValidationExceptions */
@Catch(AxiosError<any>)
export class StoreValidationFilter extends AxiosErrorFilter {
	catch(exception: AxiosError<any>, host: ArgumentsHost) {
		const error = exception.response?.data;
		if (isStoreSchemaErrors(error)) {
			throw storeSchemaErrorsToPreTranslatedDetailsValidationException(error);
		} else {
			super.catch(exception, host);
		}
	}
}

type StoreSchemaError = {
	instancePath: string;
	schemaPath: string;
	keyword: "minItems" | string;
	message: string;
}

type StoreSchemaErrors = {
	error: StoreSchemaError[];
}

export const isStoreSchemaError = (error: any): error is StoreSchemaError => !!error?.instancePath;
const isStoreSchemaErrors = (error: any): error is StoreSchemaErrors => isStoreSchemaError(error?.error?.[0]);

export const storeSchemaErrorsToPreTranslatedDetailsValidationException = (error: StoreSchemaErrors) =>
	new PreTranslatedDetailsValidationException(merge(...error.error.map(toValidationDetail)));

export const toValidationDetail = (error: StoreSchemaError): PreTranslatedDetailsValidationException["details"] => (
	{ [error.instancePath]: [error.message] }
);

const merge = (...validationErrors: PreTranslatedDetailsValidationException["details"][]) => {
	return validationErrors.reduce((merged, error) => {
		const path = firstFromNonEmptyArr(Object.keys(error));
		if (!merged[path]) {
			merged[path] = [];
		}
		merged[path]! = [...merged[path]!, ...error[path]!];
		return merged;
	}, {});
};
