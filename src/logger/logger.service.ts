import { ConsoleLogger, Injectable } from "@nestjs/common";
import { MailService } from "src/mail/mail.service";

@Injectable()
export class LoggerService extends ConsoleLogger {
	constructor(private mailService: MailService) {
		super();
	}

	fatal(message: any, stack?: string, context?: string) {
		super.fatal(message, stack, context);
		void this.mailService.sendFatalErrorLogEntry(message, stack, context);
	}
}
