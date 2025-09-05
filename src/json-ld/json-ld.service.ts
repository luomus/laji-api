import { HttpException, Injectable } from "@nestjs/common";
import { jsonSchemaToEmbeddedJsonLDContext } from "src/json-ld/json-ld.utils";
import { SwaggerRemoteRefEntry } from "src/swagger/swagger-remote.decorator";
import { SwaggerService } from "src/swagger/swagger.service";
import * as jsonld from "jsonld";
import { JSONObjectSerializable } from "src/typing.utils";
import { LANGS, Lang } from "src/common.dto";
import { ConfigService } from "@nestjs/config";

export const localJsonLdContextToRemoteSwaggerRefEntry: Record<string, SwaggerRemoteRefEntry> = {};

@Injectable()
export class JsonLdService {
	constructor(private swaggerService: SwaggerService, private config: ConfigService) {}

	private async getEmbeddedContextForLocalName(name: string, lang?: Lang) {
		const entry = localJsonLdContextToRemoteSwaggerRefEntry[name];
		if (!entry) {
			throw new HttpException(`JSON-LD context not found for name '${name}'`, 404);
		}

		const remoteSwagger = await this.swaggerService.getRemoteSwaggerDoc(entry);
		const remoteComponentSchema = await this.swaggerService.getSchemaForEntry(entry);
		return { "@context": jsonSchemaToEmbeddedJsonLDContext(remoteComponentSchema, remoteSwagger, lang) };
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
			return ( await this.getEmbeddedContextForLocalContext(context))["@context"];
		}
		return (await jsonld.documentLoader(context)).document["@context"] as JSONObjectSerializable;
	}
}
