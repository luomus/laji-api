import { Body, HttpCode, Post } from "@nestjs/common";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { FeedbackService } from "./feedback.service";
import { ApiUser } from "src/decorators/api-user.decorator";
import { FeedbackDto } from "./feedback.dto";
import { ApiUserEntity } from "src/api-users/api-user.entity";
import { RequestPerson }from "src/decorators/request-person.decorator";
import { Person } from "src/persons/person.dto";
import { ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Feedback")
@LajiApiController("feedback")
export class FeedbackController {

	constructor(private feedbackService: FeedbackService) {}

	@Post()
	@HttpCode(204)
	@ApiResponse({
		status: 204,
		description: "Feedback succesfully sent"
	})
	async send(
		@Body() feedback: FeedbackDto,
		@ApiUser() apiUser: ApiUserEntity,
		@RequestPerson({ required: false }) person?: Person
	) {
		await this.feedbackService.send(feedback, apiUser, person);
	}
}
