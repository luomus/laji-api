import { ISendMailOptions, MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { Person } from "src/persons/person.dto";
import { ConfigService } from "@nestjs/config";
import { CompleteMultiLang } from "src/common.dto";

type FormPermissionMailContext = { formTitle: CompleteMultiLang };

type HasEmailAddress = { emailAddress: string };

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

	async sendFormPermissionRequested(user: HasEmailAddress, context: FormPermissionMailContext) {
		return this.send({
			to: user.emailAddress,
			subject: `Pääsypyyntösi lomakkeelle "${context.formTitle.fi}" on vastaanotettu`,
			template: "./form-permission-requested",
			context
		});
	}

	async sendFormPermissionAccepted(user: HasEmailAddress, context: FormPermissionMailContext) {
		return this.send({
			to: user.emailAddress,
			subject: `Pääsypyyntösi lomakkeelle "${context.formTitle.fi}" on hyväksytty`,
			template: "./form-permission-accepted",
			context
		});
	}

	async sendFormPermissionRevoked(user: HasEmailAddress, context: FormPermissionMailContext) {
		return this.send({
			to: user.emailAddress,
			subject: `Pääsypyyntösi lomakkeelle "${context.formTitle.fi}" on hylätty`,
			template: "./form-permission-revoked",
			context
		});
	}

	async sendFormPermissionRequestReceived(
		user: HasEmailAddress,
		context: FormPermissionMailContext & { person: Person, formID: string }
	) {
		return this.send({
			to: user.emailAddress,
			subject: `Uusi pääsypyyntö lomakkeelle "${context.formTitle.fi}" odottaa käsittelyä`,
			template: "./form-permission-request-received",
			context
		});
	}

	async sendApiUserCreated(user: HasEmailAddress, token: string) {
		return this.send({
			to: user.emailAddress,
			subject: `Access token for ${this.configService.get("MAIL_BASE")}`,
			template: "./api-user-created",
			context: { token }
		});
	}
}
