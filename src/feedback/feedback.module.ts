import { Module } from "@nestjs/common";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";
import { AccessTokenModule } from "src/access-token/access-token.module";
import { MailModule } from "src/mail/mail.module";
import { TriplestoreModule } from "src/triplestore/triplestore.module";

@Module({
	controllers: [FeedbackController],
	providers: [FeedbackService],
	imports: [MailModule, TriplestoreModule]
})
export class FeedbackModule {}
