import { ISendMailOptions, MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { Person } from "src/persons/person.dto";
import { ConfigService } from "@nestjs/config";
import { CompleteMultiLang } from "src/common.dto";

type FormPermissionMailContext = { formTitle: CompleteMultiLang };

@Injectable()
export class MailService {
	constructor(
		private mailerService: MailerService,
		private configService: ConfigService) {}

	private send(options: ISendMailOptions) {
		const staging = this.configService.get("STAGING");
		const subject = staging ? `[STAGING] ${options.subject}` : options.subject;
		if (this.configService.get("NO_MAIL") === "true") {
			return;
		}
		const context = {
			BASE: this.configService.get("MAIL_BASE"),
			...options.context
		};
		return this.mailerService.sendMail({ ...options, context, subject });
	}

	async sendFormPermissionRequested(user: Person, context: FormPermissionMailContext) {
		return this.send({
			to: user.emailAddress,
			subject: `Pääsypyyntösi lomakkeelle "${context.formTitle.fi}" on vastaanotettu`,
			template: "./form-permission-requested",
			context
		});
	}

	async sendFormPermissionAccepted(user: Person, context: FormPermissionMailContext) {
		return this.send({
			to: user.emailAddress,
			subject: `Pääsypyyntösi lomakkeelle "${context.formTitle.fi}" on hyväksytty`,
			template: "./form-permission-accepted",
			context
		});
	}

	async sendFormPermissionRevoked(user: Person, context: FormPermissionMailContext) {
		return this.send({
			to: user.emailAddress,
			subject: `Pääsypyyntösi lomakkeelle "${context.formTitle.fi}" on hylätty`,
			template: "./form-permission-revoked",
			context
		});
	}

	async sendFormPermissionRequestReceived(
		user: Person,
		context: FormPermissionMailContext & { person: Person, formID: string }
	) {
		return this.send({
			to: user.emailAddress,
			subject: `Uusi pääsypyyntö lomakkeelle "${context.formTitle.fi}" odottaa käsittelyä`,
			template: "./form-permission-request-received",
			context
		});
	}

}
