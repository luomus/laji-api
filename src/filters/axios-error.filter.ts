import { ArgumentsHost, Catch } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { AxiosError } from "axios";
import { ExternalException } from "src/utils";

/** Adds external errors to the response */
@Catch(AxiosError<any>)
export class AxiosErrorFilter extends BaseExceptionFilter {
	catch(exception: AxiosError<any>, host: ArgumentsHost) {
		super.catch(
			new ExternalException(
				exception.response?.data || "Outgoing request failed without message",
				exception.response?.status || -1
			), host
		);
	}
}
