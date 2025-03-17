import { HasJsonLdContext, Lang } from "src/common.dto";
import { JSONObjectSerializable } from "src/typing.utils";
import { JSONSchema, isJSONSchemaObject, isJSONSchemaRef } from "src/json-schema.utils";
import { parseURIFragmentIdentifierRepresentation } from "src/utils";
import { OpenAPIObject } from "@nestjs/swagger";
import { HttpException } from "@nestjs/common";

export const applyLangToJsonLdContext = <T extends HasJsonLdContext>(item: T, lang?: Lang) => {
	return {
		...item,
		"@context": getJsonLdContextForLang(item["@context"], lang)
	};
};

const getJsonLdContextForLang = (jsonLdContext: string, lang?: Lang) => {
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

export const jsonSchemaToEmbeddedJsonLDContext = (
	schema: JSONSchema,
	jsonSchemaBase: OpenAPIObject,
	lang?: Lang
) : JSONObjectSerializable => {
	if (isJSONSchemaRef(schema)) {
		if (schema.$ref === "#/components/schemas/MultiLangDto") {
			return langObject(lang);
		}
		return jsonSchemaToEmbeddedJsonLDContext(
			parseURIFragmentIdentifierRepresentation(jsonSchemaBase, schema.$ref),
			jsonSchemaBase
		);
	} else if (isJSONSchemaObject(schema)) {
		const { properties = {} } = schema;
		if (["fi", "sv", "en"].every(lang => properties[lang])) {
			return langObject(lang);
		} else {
			return Object.keys(properties).reduce((objectJsonLDContext, property) => {
				objectJsonLDContext[property] = jsonSchemaToEmbeddedJsonLDContext(
					properties[property]!,
					jsonSchemaBase
				);
				return objectJsonLDContext;
			}, {} as JSONObjectSerializable);
		}
	}
	if (schema.type === "array") {
		return { "@container": "@set", ...jsonSchemaToEmbeddedJsonLDContext(schema.items, jsonSchemaBase) };
	} else if (schema.type === "string") {
		return { "@type": "string" };
	} else if (schema.type === "number") {
		return { "@type": "number" };
	} else if (schema.type === "boolean") {
		return { "@type": "boolean" };
	} else if (schema.type === "integer") {
		return { "@type": "integer" };
	}
	throw new Error(`Unhandled json schema type ${schema}`);
};
