import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { Module } from "@nestjs/common";
import { MailService } from "./mail.service";
import { join } from "path";
import { ConfigService } from "@nestjs/config";

@Module({
	imports: [
		MailerModule.forRootAsync({
			useFactory: async (configService: ConfigService) => ({
				transport: {
					host: configService.get("MAIL_HOST"),
					port: configService.get("MAIL_PORT"),
					secure: false
				},
				defaults: {
					from: `noreply@${configService.get("MAIL_FROM_BASE")}`,
				},
				template: {
					dir: join(__dirname, "templates"),
					adapter: new HandlebarsAdapter({
						json: (context: any) => JSON.stringify(context, null, 2),
					}),
					options: {
						strict: true,
					},
				},
			}),
			inject: [ConfigService],
		})
	],
	providers: [MailService],
	exports: [MailService],
})
export class MailModule {}
