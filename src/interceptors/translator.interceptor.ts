import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, firstValueFrom, map } from "rxjs";
import { HasJsonLdContext, QueryWithLangDto } from "src/common.dto";
import { applyToResult, isPageLikeResult } from "src/pagination.utils";
import { Request } from "src/request";
import { plainToClass } from "class-transformer";
import { LangService } from "src/lang/lang.service";
import { applyLangToJsonLdContext, jsonSchemaToInlineJsonLDContext } from "src/json-ld.utils";
import { RemoteSwaggerSchemaOptions, getRemoteSwaggerSchemaOptions }
	from "src/decorators/remote-swagger-schema.decorator";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { parseJSONPointer } from "src/utils";
import { JSONSchema, OpenAPIDocument } from "src/json-schema.utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";

@Injectable()
export class Translator implements NestInterceptor {

	constructor(
		private langService: LangService,
		private httpService: HttpService,
		private configService: ConfigService,
		private cache: RedisCacheService
	) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		return next.handle().pipe(map(result => this.translate(request.query, result)));
	}

	async translate(rawQuery: QueryWithLangDto, result: any) {
		const query = plainToClass(QueryWithLangDto, rawQuery);
		const { lang, langFallback } = query;
		const sample = this.takeSample(result);
		const jsonLdContext = await this.getJsonLdContext(sample);
		if (sample) {
			if (!jsonLdContext) {
				throw new Error("Translator failed to get the @context for item");
			}
			const translated = await applyToResult(
				await this.langService.contextualTranslateWith(jsonLdContext, lang, langFallback),
			)(result);
			return typeof jsonLdContext === "string"
				? applyLangToJsonLdContext(translated as HasJsonLdContext, lang)
				: translated;
		}
		return result;
	};

	private takeSample(result: any) {
		if (isPageLikeResult(result)) {
			return result.results[0];
		} else if (Array.isArray(result)) {
			return result[0];
		}
		return result;
	}

	private async getJsonLdContext(sample: Record<string, unknown>) {
		if (!sample) {
			return undefined;
		}
		if (sample["@context"]) {
			return sample["@context"] as string;
		}
		return this.getJsonLdContextForConstructor(sample.constructor);
	}

	@IntelligentMemoize()
	// eslint-disable-next-line @typescript-eslint/ban-types
	private async getJsonLdContextForConstructor(constructor: Function) {
		const remoteSwaggerSchemaOptions = getRemoteSwaggerSchemaOptions(constructor);
		if (!remoteSwaggerSchemaOptions) {
			return undefined;
		}
		const remoteSwagger = await this.getRemoteSwagger(remoteSwaggerSchemaOptions);
		const remoteComponentSchema = parseJSONPointer<JSONSchema>(
			remoteSwagger,
			`/components/schemas/${remoteSwaggerSchemaOptions.ref}`
		);
		return jsonSchemaToInlineJsonLDContext(remoteComponentSchema, remoteSwagger);
	}

	private async getRemoteSwagger(options: RemoteSwaggerSchemaOptions) {
		const host = this.configService.get(options.swaggerHostConfigKey);
		const url = `${host}/${options.swaggerPath}`;
		const cached = await this.cache.get<OpenAPIDocument>(url);
		if (cached !== null) {
			return cached;
		}
		const remoteSwagger = await firstValueFrom(
			this.httpService.get<OpenAPIDocument>(url).pipe(map(r => r.data))
		);
		await this.cache.set(url, remoteSwagger);
		return remoteSwagger;
	}
}
