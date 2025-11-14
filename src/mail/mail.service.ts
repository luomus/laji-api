import { ISendMailOptions, MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { Person } from "src/persons/person.dto";
import { ConfigService } from "@nestjs/config";
import { CompleteMultiLang } from "src/common.dto";
import { NamedPlace } from "src/named-places/named-places.dto";
import { FeedbackDto, InformationSystem } from "src/feedback/feedback.dto";
type FormPermissionMailContext = { formTitle: CompleteMultiLang };

type HasEmailAddress = { emailAddress: string };

const ERROR_EMAIL = "grp-a97800-errors@helsinki.fi";

@Injectable()
export class MailService {
	constructor(
		private mailerService: MailerService,
		private configService: ConfigService
	) {}

	private send(options: ISendMailOptions) {
		if (this.configService.get("NO_MAIL") === "true") {
			return;
		}
		const staging = this.configService.get("STAGING") === "true";
		const subject = staging ? `[STAGING] ${options.subject}` : options.subject;
		const context = {
			BASE: this.configService.get("MAIL_BASE"),
			API_BASE: this.configService.get("MAIL_API_BASE"),
			...options.context
		};
		return this.mailerService.sendMail({ ...options, context, subject });
	}

	sendFormPermissionRequested(user: HasEmailAddress, context: FormPermissionMailContext) {
		return this.send({
			to: user.emailAddress,
			subject: `Pääsypyyntösi lomakkeelle "${context.formTitle.fi}" on vastaanotettu`,
			template: "./form-permission-requested",
			context
		});
	}

	sendFormPermissionAccepted(user: HasEmailAddress, context: FormPermissionMailContext) {
		return this.send({
			to: user.emailAddress,
			subject: `Pääsypyyntösi lomakkeelle "${context.formTitle.fi}" on hyväksytty`,
			template: "./form-permission-accepted",
			context
		});
	}

	sendFormPermissionRequestReceived(
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

	sendApiUserCreated(user: HasEmailAddress, token: string) {
		return this.send({
			to: user.emailAddress,
			subject: `Access token for ${this.configService.get("MAIL_API_BASE")}`,
			template: "./api-user-created",
			context: { token }
		});
	}

	sendNamedPlaceReserved(user: HasEmailAddress, context: { place: NamedPlace, until: string}) {
		return this.send({
			to: user.emailAddress,
			subject: "Vakiolinjan varauksen vahvistus",
			template: "./named-place-reserved",
			context
		});
	}

	sendFatalErrorLogEntry(message: any, stack?: string, context?: unknown) {
		return this.send({
			to: ERROR_EMAIL,
			subject: "laji-api error",
			template: "./fatal-error",
			context: {
				message,
				stack: JSON.stringify(stack, undefined, 2),
				context: JSON.stringify(context, undefined, 2)
			}
		});
	}

	sendFeedback(feedback: FeedbackDto, system: InformationSystem, person?: Person) {
		return this.send({
			to: "helpdesk@laji.fi",
			from: person?.emailAddress,
			subject: feedback.subject,
			template: "./feedback",
			context: {
				message: JSON.stringify(feedback.message, undefined, 2),
				meta: JSON.stringify(feedback.meta, undefined, 2),
				system,
				person
			}
		});
	}
}
