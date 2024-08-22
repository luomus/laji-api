import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { PersonsService } from "src/persons/persons.service";

/** Extracts a person from the request, if the request has a `personToken` in the query params or the path params. */
@Injectable()
export class PersonTokenInterceptor implements NestInterceptor {
	constructor(private personsService: PersonsService) {}

	async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
		const request = context.switchToHttp().getRequest();
		const personToken = request.params.personToken || request.query.personToken;
		if (personToken) {
			request.person = await this.personsService.getByToken(personToken);
		}
		return next.handle();
	}
}
