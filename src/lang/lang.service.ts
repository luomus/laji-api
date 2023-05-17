import { Injectable } from "@nestjs/common";
import { CompleteMultiLang, HasContext, Lang, LANGS, MultiLang } from "src/common.dto";
import { MetadataService } from "src/metadata/metadata.service";

const LANG_FALLBACKS: (Lang.en | Lang.fi)[] = [Lang.en, Lang.fi];

@Injectable()
export class LangService {

	constructor(private metadataService: MetadataService) {}

	async translate<T extends HasContext, R extends HasContext>
	(collection: T, lang: Lang = Lang.en, langFallback = true, extraMultiLangKeys?: (keyof T)[]): Promise<R> {
	 const contextProperties = await this.metadataService.getPropertiesForContext(collection["@context"]);
	 const multiLangKeys = Object.keys(contextProperties).reduce((keys, propertyKey) => {
		 const property = contextProperties[propertyKey];
		 if (property.multiLanguage) {
			 keys.push(property.shortName);
		 }
		 return keys;
	 }, (extraMultiLangKeys || []) as string[]);
	 const multiLangValuesTranslated = multiLangKeys.reduce((acc: Partial<T>, prop: string) => {
		 (acc as any)[prop] = getLangValue(((collection as any)[prop] as (MultiLang | undefined)), lang, langFallback);
		 return acc;
	 }, {})
	 return {
		 ...collection,
		 ...multiLangValuesTranslated
	 } as unknown as R;
	}

	translateWith<T extends HasContext, R extends HasContext>(
		lang = Lang.en,
		fallbackLang = true,
		extraMultiLangKeys?: (keyof T)[]
	) {
		return (item: T) => this.translate<T, R>(item, lang, fallbackLang, extraMultiLangKeys);
	}
}


const getLangValueWithFallback = (multiLangValue?: MultiLang, fallbackLang = true): string | undefined => {
	if (fallbackLang && multiLangValue) {
		const langIdx = LANG_FALLBACKS.findIndex(lang => multiLangValue[lang]);
		if (langIdx > 0) {
			const fallbackLang = LANG_FALLBACKS[langIdx];
			return multiLangValue[fallbackLang] as string;
		}
	}
}

const getMultiLangWithFallback = (multiLangValue?: MultiLang, langFallback = true): CompleteMultiLang => {
	return LANGS.reduce((multiLangValueFilled: CompleteMultiLang, lang) => {
		const value = multiLangValue?.[lang];
		multiLangValueFilled[lang] = value === undefined
			? getLangValueWithFallback(multiLangValue, langFallback) ?? ""
			: value;
		return multiLangValueFilled;
	}, {} as CompleteMultiLang);
}

function getLangValue(multiLangValue: MultiLang | undefined, lang: Lang.multi, langFallback?: boolean)
	: CompleteMultiLang;
function getLangValue(multiLangValue?: MultiLang, lang?: Exclude<Lang, Lang.multi>, langFallback?: boolean)
	: string | undefined;
function getLangValue(multiLangValue?: MultiLang, lang?: Lang, langFallback?: boolean)
	: CompleteMultiLang | string | undefined;
function getLangValue(multiLangValue?: MultiLang, lang: Lang = Lang.en, langFallback = true)
	: CompleteMultiLang | string | undefined {
	if (lang === Lang.multi) {
		return getMultiLangWithFallback(multiLangValue, langFallback);
	}
	if (!multiLangValue) {
		return undefined;
	}
	const langValue = multiLangValue[lang];
	if (langValue !== undefined) {
		return langValue;
	}
	return getLangValueWithFallback(multiLangValue);
}
