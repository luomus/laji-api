import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { PersonsService } from "src/persons/persons.service";
import { Request } from "src/request";
import { Reflector } from "@nestjs/core";
import { AuthenticationEventService } from "src/authentication-event/authentication-event.service";
import { ErrorCodeException } from "src/utils";

/**
 * Extracts a person from the request's person token, implanting the person object into the request object so it can be
 * accessed with `request.person`
 * */
@Injectable()
export class PersonTokenInterceptor implements NestInterceptor {

	constructor(
		private personsService: PersonsService, 
		private reflector: Reflector,
		private authenticationEventService: AuthenticationEventService
	) {}

	async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
		const request = context.switchToHttp().getRequest<Request>();
		const bypass = this.reflector.get<boolean>("BypassPersonTokenInterceptor", context.getHandler());
		if (bypass) {
			return next.handle();
		}

		const personToken = getPersonTokenFromRequest(request);
		if (personToken && typeof personToken === "string") {
			const authEvent = await this.authenticationEventService.getInfo(personToken);
			if (request.apiUser?.systemID !== authEvent.target) {
				const error = new ErrorCodeException("ACCESS_TOKEN_PERSON_TOKEN_MISMATCH", 401);
				error.message = "The person token is for a different system than which the access token is for";
				throw error;
			}
			(request as any).person = await this.personsService.getByToken(personToken);
		}
		return next.handle();
	}
}

export const getPersonTokenFromRequest = (request: Request) => {
	if (request.headers["api-version"] === "1" && request.query.personToken) {
		// eslint-disable-next-line max-len
		throw new HttpException("Person token in query parameters is deprecated for API v1. Please use 'person-token' header instead.", 422);
	}
	return request.params.personToken || request.query.personToken || request.headers["person-token"];
};
