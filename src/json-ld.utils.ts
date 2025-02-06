import { HasJsonLdContext, Lang } from "./common.dto";

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
