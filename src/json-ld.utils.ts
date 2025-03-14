import { HasJsonLdContext, Lang } from "./common.dto";
import { JSONObjectSerializable } from "./typing.utils";
import { JSONSchema, isJSONSchemaObject, isJSONSchemaRef } from "./json-schema.utils";
import { parseURIFragmentIdentifierRepresentation } from "./utils";

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
	return jsonLdContext;
};

export const jsonSchemaToInlineJsonLDContext = (
	schema: JSONSchema,
	jsonSchemaBase: { components?: { schemas: Record<string, JSONSchema> } }
)
	: JSONObjectSerializable => {
	if (isJSONSchemaRef(schema)) {
		if (schema.$ref === "#/components/schemas/MultiLangDto") {
			return { "@type": "xsd:string", "@container": "@language" };
		}
		return jsonSchemaToInlineJsonLDContext(
			parseURIFragmentIdentifierRepresentation(jsonSchemaBase, schema.$ref),
			jsonSchemaBase
		);
	} else if (isJSONSchemaObject(schema)) {
		const { properties = {} } = schema;
		if (["fi", "sv", "en"].every(lang => properties[lang])) {
			return { "@type": "xsd:string", "@container": "@language" };
		} else {
			return Object.keys(properties).reduce((objectJsonLDContext, property) => {
				objectJsonLDContext[property] = jsonSchemaToInlineJsonLDContext(properties[property]!, jsonSchemaBase);
				return objectJsonLDContext;
			}, {
				"@id": "schema:Object",
				"@type": "@id"
			} as JSONObjectSerializable);
		}
	}
	if (schema.type === "array") {
		return { "@container": "@set", ...jsonSchemaToInlineJsonLDContext(schema.items, jsonSchemaBase) };
	} else if (schema.type === "string") {
		return { "@type": "xsd:string" };
	} else if (schema.type === "number") {
		return { "@type": "xsd:string" };
	} else if (schema.type === "boolean") {
		return { "@type": "xsd:boolean" };
	} else if (schema.type === "integer") {
		return { "@type": "xsd:integer" };
	}
	throw new Error(`Unhandled json schema type ${schema}`);
};
