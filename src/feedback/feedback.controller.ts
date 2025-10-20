import { Body, HttpCode, Post } from "@nestjs/common";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { FeedbackService } from "./feedback.service";
import { ApiUser } from "src/decorators/api-user.decorator";
import { FeedbackDto } from "./feedback.dto";
import { ApiUserEntity } from "src/api-users/api-user.entity";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Feedback")
@LajiApiController("feedback")
export class FeedbackController {

	constructor(private feedbackService: FeedbackService) {}

	@Post()
	@HttpCode(204)
	send(
		@Body() feedback: FeedbackDto,
		@ApiUser() apiUser: ApiUserEntity,
		@PersonToken({ required: false }) person?: Person
	) {
		return this.feedbackService.send(feedback, apiUser, person);
	}
}
