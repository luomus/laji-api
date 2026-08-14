import { HttpException, Inject, Injectable } from "@nestjs/common";
import { FeedbackDto, InformationSystem } from "./feedback.dto";
import { ApiUserEntity } from "src/api-users/api-user.entity";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { Person } from "src/persons/person.dto";
import { GLOBAL_CLIENT } from "src/provider-tokens";
import { RestClientService } from "src/rest-client/rest-client.service";
import { JSONSerializable } from "src/typing.utils";
import { ConfigService } from "@nestjs/config";
import { Lang, MultiLangAsString } from "src/common.dto";
import { LangService } from "src/lang/lang.service";

@Injectable()
export class FeedbackService {
	constructor(
		private triplestoreService: TriplestoreService,
		@Inject(GLOBAL_CLIENT) private globalClient: RestClientService<JSONSerializable>,
		private config: ConfigService,
		private langService: LangService
	) {}

	async send(feedback: FeedbackDto, apiUser: ApiUserEntity, person?: Person) {
		const { systemID }  = apiUser;
		if (!systemID) {
			// eslint-disable-next-line max-len
			throw new HttpException("Sending feedback with an access token without a systemID not allowed", 403);
		}
		const translatedSystem = await this.langService.translate(
			await this.triplestoreService.get<InformationSystem>(systemID),
			[{ lang: Lang.fi }]
		) as MultiLangAsString<InformationSystem>;
		await this.globalClient.post(this.config.get<string>("EFECTE_HOST"), {
			customer: person?.emailAddress,
			customerEmail: person?.emailAddress,
			subject: feedback.subject,
			description: getFeedbacMessage(feedback, translatedSystem),
			contactType: "Verkkolomake",
			unit: "UNIT-00000097",
			supportGroup: "SG-00000185",
			categoryLevel1: "CAT-00003089",
		}, {
			headers: {
				"X-Api-Key": this.config.get<string>("EFECTE_API_KEY")
			}
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
