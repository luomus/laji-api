import { ArgumentsHost, Catch } from "@nestjs/common";
import { AxiosError } from "axios";
import { ExternalException } from "src/utils";
import { ErrorSignatureBackwardCompatibilityFilter } from "./error-signature-backward-compatibility.filter";

/** Adds external errors to the response */
@Catch(AxiosError<any>)
export class AxiosErrorFilter extends ErrorSignatureBackwardCompatibilityFilter<any> {
	catch(exception: AxiosError<any>, host: ArgumentsHost) {
		super.catch(
			new ExternalException(
				exception.response?.data || "Outgoing request failed without message",
				exception.response?.status || -1
			), host
		);
	}
}
