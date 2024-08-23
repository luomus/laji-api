import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { ApiUsersService } from "src/api-users/api-users.service";
import { Request } from "src/request";

/** Injects needed services into requests, so they are accessible outside execution context */
@Injectable()
export class ServicesInjector implements NestInterceptor {
	constructor(private apiUsersService: ApiUsersService) {}

	async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
		const request = context.switchToHttp().getRequest<Request>();
		request.apiUsersService = this.apiUsersService;
		return next.handle();
	}
}
