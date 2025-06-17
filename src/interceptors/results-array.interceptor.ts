import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { addContextToPageLikeResult } from "src/pagination.utils";
import { SchemaItem } from "src/swagger/swagger.service";

@Injectable()
export class ResultsArray implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(map(toResultsArray));
	}
}

const toResultsArray = (results: any[]) => addContextToPageLikeResult({ results });

export const swaggerResponseAsResultsArray = (schema: SchemaItem) => ({
	type: "object",
	properties: { results: { type: "array", items: schema }, "@context": { type: "string" } }
});
