import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { Request } from "express";
import { plainToClass } from "class-transformer";
import { HasLimitDto } from "src/autocomplete/autocomplete.dto";

@Injectable()
export class Limit implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		const query = plainToClass(HasLimitDto, request.query);
		const { limit } = query;
		return next.handle().pipe(map(r => r.slice(0, limit)));
	}
}
