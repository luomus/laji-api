import { Lang } from "src/common.dto";
import { JSONObjectSerializable } from "src/typing.utils";
import { JSONSchema, TypedJSONSchema, isJSONSchemaArray, isJSONSchemaObject, isJSONSchemaRef }
	from "src/json-schema.utils";
import { parseURIFragmentIdentifierRepresentation } from "src/utils";
import { OpenAPIObject } from "@nestjs/swagger";
import { HttpException } from "@nestjs/common";
import { instanceToInstance } from "class-transformer";
import { LOCAL_JSON_LD_CONTEXT_METADATA_KEY } from "src/decorators/local-json-ld-context.decorator";

export const applyLangToJsonLdContext = <T extends Record<string, unknown>>(item: T, lang?: Lang) => {
	if ((item as any).constructor === Object) { // Slight optimization to prevent deeply copying if it's just a simple object.
		item = { ...item };
	} else {
		item = instanceToInstance(item);
	}
	(item as any)["@context"] = getJsonLdContextForLang(getJsonLdContextFromSample(item), lang);
	return item;
};

const getJsonLdContextForLang = (jsonLdContext?: string, lang?: Lang) => {
	if (!jsonLdContext) {
		return jsonLdContext;
	}
	if (lang && lang !== Lang.multi && jsonLdContext.startsWith("http://schema.laji.fi")) {
		return jsonLdContext.replace(/\.jsonld$/, `-${lang}.jsonld`);
	}
	const { SELF_HOST } = process.env;
	if (typeof SELF_HOST !== "string") {
		throw new HttpException("`SELF_HOST` env variable not found", 500);
	}
	if (jsonLdContext.startsWith(SELF_HOST)) {
		return `${jsonLdContext}-${lang || "en"}`;
	}
	return jsonLdContext;
};

const langObject = (lang: Lang = Lang.multi): JSONObjectSerializable =>
	lang === Lang.multi
		? { "@type": "string", "@container": "@language" }
		: { "@type": "string", "@language": lang };

export const jsonSchemaToEmbeddedJsonLdContext = (
	schema: JSONSchema,
	jsonSchemaBase?: OpenAPIObject,
	lang?: Lang
) : JSONObjectSerializable => {
	if (isJSONSchemaRef(schema)) {
		if (schema.$ref === "#/components/schemas/MultiLangDto") {
			return langObject(lang);
		}
		if (!jsonSchemaBase) {
			throw new Error("Can't parse refs if there's no OpenAPI document to parse from");
		}
		return jsonSchemaToEmbeddedJsonLdContext(
			parseURIFragmentIdentifierRepresentation(jsonSchemaBase, schema.$ref),
			jsonSchemaBase
		);
	} else if (isJSONSchemaObject(schema)) {
		const { properties = {} } = schema;
		if (["fi", "sv", "en"].every(lang => properties[lang])) {
			return langObject(lang);
		} else {
			return Object.keys(properties).reduce((objectJsonLDContext, property) => {
				objectJsonLDContext[property] = jsonSchemaToEmbeddedJsonLdContext(
					properties[property]!,
					jsonSchemaBase
				);
				return objectJsonLDContext;
			}, {} as JSONObjectSerializable);
		}
	}
	if (isJSONSchemaArray(schema)) {
		return { "@container": "@set", ...jsonSchemaToEmbeddedJsonLdContext(schema.items, jsonSchemaBase) };
	} else if ((schema as TypedJSONSchema).type === "string") {
		return { "@type": "string" };
	} else if ((schema as TypedJSONSchema).type === "number") {
		return { "@type": "number" };
	} else if ((schema as TypedJSONSchema).type === "boolean") {
		return { "@type": "boolean" };
	} else if ((schema as TypedJSONSchema).type === "integer") {
		return { "@type": "integer" };
	}
	throw new Error(`Unhandled json schema type ${schema}`);
};


export const addLocalJsonLdContext = (localJsonLdContext?: string) =>
	(result: any) => {
		if (!localJsonLdContext) {
			return result;
		}
		const { SELF_HOST } = process.env;
		if (typeof SELF_HOST !== "string") {
			throw new HttpException("`SELF_HOST` env variable not found", 500);
		}
		result["@context"] = `${SELF_HOST}/context/${localJsonLdContext}`;
		return result;
	};

export const getJsonLdContextFromSample = (sample?: Record<string, unknown>) => {
	if (!sample) {
		return undefined;
	}
	if (sample["@context"]) {
		return sample["@context"] as string;
	}
	const localJsonLdContextName = Reflect.getMetadata(LOCAL_JSON_LD_CONTEXT_METADATA_KEY, sample.constructor);
	if (localJsonLdContextName) {
		const { SELF_HOST } = process.env;
		return `${SELF_HOST}/context/${localJsonLdContextName}`;
	}
};
