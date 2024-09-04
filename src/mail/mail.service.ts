import { ISendMailOptions, MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { Person } from "src/persons/person.dto";
import { ConfigService } from "@nestjs/config";
import { CompleteMultiLang } from "src/common.dto";
import { NamedPlace } from "src/named-places/named-places.dto";

type FormPermissionMailContext = { formTitle: CompleteMultiLang };

type HasEmailAddress = { emailAddress: string };

const FINBIF_EMAIL = "www@luomus.fi";

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
			API_BASE: this.configService.get("MAIL_API_BASE"),
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
			subject: `Access token for ${this.configService.get("MAIL_API_BASE")}`,
			template: "./api-user-created",
			context: { token }
		});
	}

	async sendApiUserCreationFailed(user: HasEmailAddress) {
		void this.send({
			to: user.emailAddress,
			subject: `Access token for ${this.configService.get("MAIL_API_BASE")} failed`,
			template: "./api-user-creation-failed",
		});
		return this.send({
			to: FINBIF_EMAIL,
			subject: "Access token creation failed",
			template: "./api-user-creation-failed-recipient-internal",
			context: { user }
		});
	}

	async sendNamedPlaceReserved(user: HasEmailAddress, context: { place: NamedPlace, until: string}) {
		return this.send({
			to: user.emailAddress,
			subject: "Vakiolinjan varauksen vahvistus",
			template: "./named-place-reserved",
			context
		});
	}
}
