import { Module } from "@nestjs/common";
import { ConsoleLoggerService } from "./console-logger.service";
import { MailModule } from "src/mail/mail.module";

@Module({
	providers: [ConsoleLoggerService],
	exports: [ConsoleLoggerService],
	imports: [MailModule]
})
export class ConsoleLoggerModule {}
