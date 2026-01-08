import { ISendMailOptions, MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { Person, decoratePerson } from "src/persons/person.dto";
import { ConfigService } from "@nestjs/config";
import { CompleteMultiLang, Lang, MultiLangAsString } from "src/common.dto";
import { NamedPlace } from "src/named-places/named-places.dto";
import { FeedbackDto, InformationSystem } from "src/feedback/feedback.dto";
import { LangService } from "src/lang/lang.service";
type FormPermissionMailContext = { formTitle: CompleteMultiLang };

type HasEmailAddress = { emailAddress: string };

const ERROR_EMAIL = "grp-a97800-errors@helsinki.fi";

@Injectable()
export class MailService {
	constructor(
		private mailerService: MailerService,
		private configService: ConfigService,
		private langService: LangService
	) {}

	private send(options: ISendMailOptions) {
		if (this.configService.get("NO_MAIL") === "true") {
			return;
		}
		if (options.from === undefined) {
			delete options.from;
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

	async sendFeedback(feedback: FeedbackDto, system: InformationSystem, person?: Person) {
		// Efecte doesn't support HTML so we can't use a template. The template must be there though, so we use this noop
		// template. The 'text' argument is in effect here really instead.
		const message = getFeedbacMessage(
			feedback,
			await this.langService.translate(system, Lang.fi),
			person ? decoratePerson(person) : undefined
		);
		return this.send({
			to: "lajitietokeskus@helsinki.fi",
			from: person?.emailAddress,
			subject: feedback.subject,
			template: "./noop",
			text: message
		});
	}
}

const getFeedbacMessage = (feedback: FeedbackDto, system: MultiLangAsString<InformationSystem>, person?: Person) => {
	let message = `

${ feedback.message }
=====================`;
	if (person) {
		message += `

${ person.fullName } (${person.id})

`;
	}
	message += `
${ feedback.meta }

${ system.name } ${ system.URI } (${ system.id })
`;

	return message;
};
