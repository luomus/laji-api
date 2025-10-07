import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { PersonsService } from "../persons.service";
import { Request } from "express";
import { getPersonTokenFromRequest } from "src/interceptors/person-token.interceptor";

@Injectable()
export class IctAdminGuard implements CanActivate {
	constructor(private personsService: PersonsService) {}

	canActivate(context: ExecutionContext) {
		const request = context.switchToHttp().getRequest<Request>();
		const personToken = getPersonTokenFromRequest(request);
		if (typeof personToken !== "string") {
			return false;
		}
		return this.personsService.isICTAdmin(personToken);
	}
}
