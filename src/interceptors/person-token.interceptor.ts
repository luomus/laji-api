import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { PersonsService } from "src/persons/persons.service";
import { Request } from "express";
import { Reflector } from "@nestjs/core";

/** Extracts a person from the request, if the request has a `personToken` in the query params or the path params. */
@Injectable()
export class PersonTokenInterceptor implements NestInterceptor {

	constructor(private personsService: PersonsService, private reflector: Reflector) {}

	async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
		const request = context.switchToHttp().getRequest<Request>();
		const bypass = this.reflector.get<boolean>("BypassPersonTokenInterceptor", context.getHandler());
		if (bypass) {
			return next.handle();
		}
		const personToken = request.params.personToken || request.query.personToken;
		if (personToken && typeof personToken === "string") {
			(request as any).person = await this.personsService.getByToken(personToken);
		}
		return next.handle();
	}
}
