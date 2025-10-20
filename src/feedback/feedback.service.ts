import { HttpException, Injectable } from "@nestjs/common";
import { FeedbackDto, InformationSystem } from "./feedback.dto";
import { MailService } from "src/mail/mail.service";
import { ApiUserEntity } from "src/api-users/api-user.entity";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { Person } from "src/persons/person.dto";

@Injectable()
export class FeedbackService {
	constructor(
		private mailService: MailService,
		private triplestoreService: TriplestoreService
	) {}

	async send(feedback: FeedbackDto, apiUser: ApiUserEntity, person?: Person) {
		const { systemID }  = apiUser;
		if (!systemID) {
			// eslint-disable-next-line max-len
			throw new HttpException("Sending feedback with an access token without a systemID not allowed", 403);
		}
		const system = await this.triplestoreService.get<InformationSystem>(systemID);
		return this.mailService.sendFeedback(feedback, system, person);
	}
}
