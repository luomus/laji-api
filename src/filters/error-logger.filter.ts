import { Catch, ArgumentsHost, HttpException, Logger } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";

@Catch()
export class ErrorLoggerFilter extends BaseExceptionFilter {

	logger = new Logger(ErrorLoggerFilter.name);

	catch(exception: HttpException, host: ArgumentsHost) {
		let status;
		try {
			status = exception.getStatus();
		} catch (e) { }

		if (!status || status === 500) {
			this.logger.fatal(exception, exception.stack, {
				reason: status === 500 ? "Internal server error" : "Unknown",
				...exception
			});
		}

		super.catch(exception, host);
	}
}
