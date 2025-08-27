import { isObject } from "src/typing.utils";
import { SwaggerCustomizationCommon, createSwaggerScanner } from "./swagger-scanner";
import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor, UseInterceptors, applyDecorators,
	mixin } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { applyToResult } from "src/pagination.utils";
import { jsonLdContextToRemoteSwaggerRefEntry } from "src/json-ld/json-ld.service";

export type SwaggerRemoteRefEntry = SwaggerCustomizationCommon & {
	/** The remote source */
	source?: "store" | "laji-backend",
	/** The name of the schema object in the remote OpenAPI document's schemas */
	ref?: string,
	/**
	 * Replaces the given pointer in the response schema. If not defined, the whole response schema will be replaced.
	 * Uses JSON pointer notation. Has lower precedence than `customizeResponseSchema`.
	 */
	replacePointer?: string;
	/** The local json-ld context name that is given to the result */
	jsonLdContext?: string;
};

export const isSwaggerRemoteRefEntry = (entry: unknown): entry is SwaggerRemoteRefEntry =>
	isObject(entry) && "source" in entry && "ref" in entry;

const SWAGGER_REMOTE_METADATA = "SWAGGER_REMOTE_METADATA";

/**
 * Allows defining a remote Swagger schema ref for a controller method. The referred schema is merged into our own
 *   OpenAPI document. The result will be magically paginated also.
 *
 *   It adds also interceptors to the controller method if it has `jsonLdContext` option.
 *
 * Note that the controller must be decorated with either `@LajiApiController()` or `@SwaggerRemoteScanner()`!
 * */
export function SwaggerRemoteRef(entry: SwaggerRemoteRefEntry) {
	return applyDecorators(
		bindSwaggerRemoteRefMetadata(entry),
		UseInterceptors(AddLocalJsonLdContext, BindSwaggerRemoteRefMetadata(entry))
	);
}

function bindSwaggerRemoteRefMetadata(entry: SwaggerRemoteRefEntry) {
	return function (target: any, propertyKey: any) {
		Reflect.defineMetadata(SWAGGER_REMOTE_METADATA + propertyKey, entry, target);
		if (entry.jsonLdContext) {
			jsonLdContextToRemoteSwaggerRefEntry[entry.jsonLdContext] = entry;
		}
	};
}

export const SWAGGER_REMOTE_METADATA_ITEM = "SWAGGER_REMOTE_METADATA_ITEM";

// eslint-disable-next-line @typescript-eslint/ban-types
const bindSwaggerRemoteRefMetadataToItem = (entry: SwaggerRemoteRefEntry) => (item: Object) => {
	Reflect.defineMetadata(SWAGGER_REMOTE_METADATA_ITEM, entry, item);
	return item;
};

function BindSwaggerRemoteRefMetadata(entry: SwaggerRemoteRefEntry) {
	@Injectable()
	class Test implements NestInterceptor {
		intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
			return next.handle().pipe(switchMap(applyToResult(bindSwaggerRemoteRefMetadataToItem(entry))));
		}
	}
	return mixin(Test);
}

@Injectable()
class AddLocalJsonLdContext implements NestInterceptor {

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(switchMap(applyToResult(this.addLocalJsonLdContext)));
	}

	addLocalJsonLdContext(result: any) {
		const entry: SwaggerRemoteRefEntry | undefined = Reflect.getMetadata(SWAGGER_REMOTE_METADATA_ITEM, result);
		if (!entry || !entry.jsonLdContext) {
			return result;
		}

		const { jsonLdContext } = entry;
		const { SELF_HOST } = process.env;
		if (typeof SELF_HOST !== "string") {
			throw new HttpException("`SELF_HOST` env variable not found", 500);
		}
		result["@context"] = `${SELF_HOST}/context/${jsonLdContext}`;
		return result;
	}
}

export const SwaggerRemoteScanner = createSwaggerScanner(SWAGGER_REMOTE_METADATA);
