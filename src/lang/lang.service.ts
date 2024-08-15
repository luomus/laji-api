import { Injectable } from "@nestjs/common";
import { CompleteMultiLang, HasContext, Lang, LANGS, MultiLang } from "src/common.dto";
import { MetadataService } from "src/metadata/metadata.service";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { isObject } from "src/type-utils";

const LANG_FALLBACKS: (Lang.en | Lang.fi)[] = [Lang.en, Lang.fi];

@Injectable()
export class LangService {

	constructor(private metadataService: MetadataService) {}

	async contextualTranslateWith<T, R = T>(
		context: string,
		lang: Lang = Lang.en,
		langFallback = true,
		extraMultiLangKeys: (keyof T)[] = []
	) {
		const multiLangKeys = [...extraMultiLangKeys, ...(await this.getMultiLangKeys(context))];

		return (item: T): R => {
			const multiLangValuesTranslated = multiLangKeys.reduce((acc: Partial<T>, prop: string) => {
				(acc as any)[prop] = getLangValue(((item as any)[prop] as (MultiLang | undefined)), lang, langFallback);
				return acc;
			}, {});
			return {
				...item,
				...multiLangValuesTranslated
			} as unknown as R;
		};
	}

	async translate<T extends HasContext, R extends HasContext = T>
	(item: T, lang?: Lang, langFallback?: boolean, extraMultiLangKeys?: (keyof T)[]) {
		return (
			await this.contextualTranslateWith<T, R>(item["@context"], lang, langFallback, extraMultiLangKeys)
		)(item);
	}

	@IntelligentMemoize()
	async getMultiLangKeys(context: string): Promise<string[]> {
		const contextProperties = await this.metadataService.getPropertiesForContext(context);
		const keys = Object.keys(contextProperties).reduce((keys, propertyKey) => {
			const property = contextProperties[propertyKey]!;
			if (property.multiLanguage) {
				keys.push(property.shortName);
			}
			return keys;
		}, [] as string[]);
		return keys;
	}
}

const getLangValueWithFallback = (multiLangValue?: MultiLang, fallbackLang = true): string | undefined => {
	if (fallbackLang && multiLangValue) {
		const langIdx = LANG_FALLBACKS.findIndex(lang => multiLangValue[lang]);
		if (langIdx >= 0) {
			const fallbackLang = LANG_FALLBACKS[langIdx]!;
			return multiLangValue[fallbackLang] as string;
		}
	}
};

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
};

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


interface TranslateMaybeMultiLang {
	(value: MultiLang, lang: Lang): string | undefined;
	<T>(value: T, lang: Lang): T;
}

/**
 * If given value is a multilang object, it's lang value is returned. Otherwise, the value is returned as-is. 
 *
 * This function is meant for data without LD-JSON context. Use the lang service for contextual data.
 */
export const translateMaybeMultiLang: TranslateMaybeMultiLang  =
	<T extends MultiLang | unknown>(value: T, lang: Lang): string | undefined | T => {
		if (isObject(value) && LANGS.some(lang => lang in value)) {
			return value[lang] as string | undefined;
		}
		return value as T;
	};
