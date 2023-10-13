import { Injectable } from "@nestjs/common";
import { CompleteMultiLang, HasContext, Lang, LANGS, MultiLang } from "src/common.dto";
import { MetadataService } from "src/metadata/metadata.service";

const LANG_FALLBACKS: (Lang.en | Lang.fi)[] = [Lang.en, Lang.fi];

@Injectable()
export class LangService {

	private multiLangKeyCache: Record<string, string[]> = {};

	constructor(private metadataService: MetadataService) {}

	translateWithContext<T, R = T>(context: string) { 
		return async (item: T, lang: Lang = Lang.en, langFallback = true, extraMultiLangKeys: (keyof T)[] = [])
			: Promise<R> => {
			const multiLangKeys = [...extraMultiLangKeys, ...(await this.getMultiLangKeys(context))];
			const multiLangValuesTranslated = multiLangKeys.reduce((acc: Partial<T>, prop: string) => {
				(acc as any)[prop] = getLangValue(((item as any)[prop] as (MultiLang | undefined)), lang, langFallback);
				return acc;
			}, {})
			return {
				...item,
				...multiLangValuesTranslated
			} as unknown as R;
		}
	}

	translate<T extends HasContext, R extends HasContext = T>
	(item: T, lang?: Lang, langFallback?: boolean, extraMultiLangKeys?: (keyof T)[]) {
		return this.translateWithContext<T, R>(item["@context"])(item, lang, langFallback, extraMultiLangKeys)
	}

	async getMultiLangKeys(context: string) {
		if (this.multiLangKeyCache[context]) {
			return this.multiLangKeyCache[context];
		}
		const contextProperties = await this.metadataService.getPropertiesForContext(context);
		const keys = Object.keys(contextProperties).reduce((keys, propertyKey) => {
			const property = contextProperties[propertyKey];
			if (property.multiLanguage) {
				keys.push(property.shortName);
			}
			return keys;
		}, [] as string[]);
		this.multiLangKeyCache[context] = keys;
		return keys;
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

const getMultiLangValue = (multiLangValue?: MultiLang, langFallback = true): CompleteMultiLang | undefined => {
	const completeMultiLang = LANGS.reduce((multiLangValueFilled: CompleteMultiLang, lang) => {
		const value = multiLangValue?.[lang];
		multiLangValueFilled[lang] = value === undefined
			? getLangValueWithFallback(multiLangValue, langFallback) ?? ""
			: value;
		return multiLangValueFilled;
	}, {} as CompleteMultiLang);
	return (Object.keys(completeMultiLang) as (keyof CompleteMultiLang)[]).every(k => completeMultiLang[k] === "")
		? undefined
		: completeMultiLang;
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
		return getMultiLangValue(multiLangValue, langFallback);
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
