import { Module } from "@nestjs/common";
import { LoggerService } from "./logger.service";
import { MailModule } from "src/mail/mail.module";

@Module({
	providers: [LoggerService],
	exports: [LoggerService],
	imports: [MailModule]
})
export class LoggerModule {}
