import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { Request } from "express";
import { Collection } from "./collection.dto";
import { dictionarify } from "src/utils";
import { Lang, pickFromMultiLang } from "src/common.dto";
import { PaginatedDto, isPaginatedDto } from "src/pagination";

const notReallyMultiLangKeys = dictionarify([
	"temporalCoverage", "taxonomicCoverage", "collectionLocation",
	"dataLocation", "methods", "coverageBasis", "geographicCoverage"
] as (keyof Collection)[]);

@Injectable()
export class CollectionMultiLangHackInterceptor implements NestInterceptor {

	async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
		const request = context.switchToHttp().getRequest<Request>();
		if (request.query.lang !== "multi") {
			return next.handle();
		}

		return next.handle().pipe(map(this.hackResponse.bind(this)));
	}

	hackResponse<T extends PaginatedDto<Collection> | Collection>(result: T): T {
		if (isPaginatedDto<Collection>(result)) {
			return { ...result, results: result.results.map(this.hackCollection) };
		} else {
			return this.hackCollection(result) as any;
		}
	}

	hackCollection(collection: Collection): Collection {
		// Remove language fields that are really not multilang fields.
		return Object.keys(collection).reduce((hackedCollection: Collection, k: keyof Collection) => {
			if (notReallyMultiLangKeys[k] && collection[k]) {
				(hackedCollection as any)[k] = pickFromMultiLang(collection[k] as any, Lang.en);
			} else {
				(hackedCollection as any)[k] = collection[k];
			}
			return hackedCollection;
		}, {} as Collection);
	}
}
