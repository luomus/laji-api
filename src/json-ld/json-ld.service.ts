import { HttpException, Inject, Injectable } from "@nestjs/common";
import { jsonSchemaToEmbeddedJsonLdContext } from "src/json-ld/json-ld.utils";
import { SwaggerRemoteEntry } from "src/swagger/swagger-remote.decorator";
import { SwaggerService } from "src/swagger/swagger.service";
import { JSONObjectSerializable } from "src/typing.utils";
import { LANGS, Lang } from "src/common.dto";
import { ConfigService } from "@nestjs/config";
import { SchemaObjectFactory } from "@nestjs/swagger/dist/services/schema-object-factory";
import { ModelPropertiesAccessor } from "@nestjs/swagger/dist/services/model-properties-accessor";
import { SwaggerTypesMapper } from "@nestjs/swagger/dist/services/swagger-types-mapper";
import { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { JSONSchema } from "src/json-schema.utils";
import { localJsonLdContextToClass } from "src/decorators/local-json-ld-context.decorator";
import { GLOBAL_CLIENT } from "src/provider-tokens";
import { RestClientService } from "src/rest-client/rest-client.service";
import { MS_30_MIN } from "src/utils";

export const localJsonLdContextToRemoteSwaggerEntry: Record<string, SwaggerRemoteEntry> = {};

@Injectable()
export class JsonLdService {
	constructor(
		private swaggerService: SwaggerService,
		private config: ConfigService,
		@Inject(GLOBAL_CLIENT) private globalClient: RestClientService,
	) {}

	private async getEmbeddedContextForLocalName(name: string, lang?: Lang) {
		const embeddedContext = await this.getEmbeddedContextFromRemoteSwagger(name, lang)
			|| await this.getEmbeddedContextFromMetadata(name, lang);
		if (!embeddedContext) {
			throw new HttpException(`JSON-LD context not found for name '${name}'`, 404);
		}
		return embeddedContext;
	}

	private async getEmbeddedContextFromRemoteSwagger(name: string, lang?: Lang) {
		const entry = localJsonLdContextToRemoteSwaggerEntry[name];
		if (!entry) {
			return;
		}

		const remoteSwagger = (await this.swaggerService.getRemoteSwaggerDoc(entry)).document;
		const remoteComponentSchema = await this.swaggerService.getSchemaForEntry(entry);
		return { "@context": jsonSchemaToEmbeddedJsonLdContext(remoteComponentSchema, remoteSwagger, lang) };
	}

	private async getEmbeddedContextFromMetadata(name: string, lang?: Lang) {
		const targetConstructor = localJsonLdContextToClass[name];
		if (!targetConstructor) {
			return;
		}
		const factory = new SchemaObjectFactory(new ModelPropertiesAccessor(), new SwaggerTypesMapper());

		const schemas: Record<string, SchemaObject> = {};
		factory.exploreModelSchema(targetConstructor, schemas);
		const schema = schemas[targetConstructor.name];
		if (!schema) {
			return;
		}
		return { "@context": jsonSchemaToEmbeddedJsonLdContext(
			schema as JSONSchema,
			this.swaggerService.getRawDocument(),
			lang
		) };
	}

	getEmbeddedContextForLocalContext(context: string) {
		const selfHost = this.config.get<string>("SELF_HOST");
		const lang = LANGS.find(lang => context.endsWith(`-${lang}`));
		if (lang) {
			context = context.replace(`-${lang}`, "");
		}
		const name = context.replace(`${selfHost}/context/`, "");
		return this.getEmbeddedContextForLocalName(name, lang);
	}

	async getEmbeddedContext(context: string) {
		const selfHost = this.config.get<string>("SELF_HOST") as string;
		if (context.startsWith(selfHost)) {
			return (await this.getEmbeddedContextForLocalContext(context))["@context"];
		}
		return (await this.globalClient.get<{ "@context": JSONObjectSerializable }>(
			context,
			{ headers: { accept: "application/ld+json, application/json" } },
			{ cache: MS_30_MIN }
		))["@context"];
	}
}
