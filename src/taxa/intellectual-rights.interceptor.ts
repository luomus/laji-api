import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";

@Injectable()
export class AddIntellectualRights implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(map(r => {
			r.intellectualRights = "MZ.intellectualRightsCC-BY-4.0";
			return r;
		}));
	}
}
