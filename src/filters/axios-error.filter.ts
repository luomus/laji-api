import { ArgumentsHost, Catch } from "@nestjs/common";
import { AxiosError } from "axios";
import { ExternalException } from "src/utils";
import { ErrorSignatureBackwardCompatibilityFilter } from "./error-signature-backward-compatibility.filter";
import { JSONObjectSerializable, isObject } from "src/typing.utils";

/** Adds external errors to the response */
@Catch(AxiosError<any>)
export class AxiosErrorFilter extends ErrorSignatureBackwardCompatibilityFilter<any> {
	catch(exception: AxiosError<any>, host: ArgumentsHost) {
		super.catch(
			new ExternalException(
				typeof exception.response?.data === "string"
					? exception.response?.data
					: "Outgoing request failed without message",
				exception.response?.status || 424,
				isObject(exception.response?.data)
					? exception.response!.data as JSONObjectSerializable
					: undefined
			), host
		);
	}
}
