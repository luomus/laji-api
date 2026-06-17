import { Injectable } from "@nestjs/common";
import { HasJsonLdContext, Lang, LANGS, MultiLang, MultiLangAsString } from "src/common.dto";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { isJSONObjectSerializable, isObject, JSONObjectSerializable, KeyOf, omit } from "src/typing.utils";
import { JSONPath } from "jsonpath-plus";
import { JsonLdService } from "src/json-ld/json-ld.service";
import { JsonLdDocument } from "jsonld";
import { instanceToInstance } from "class-transformer";
import { dictionarify, firstFromNonEmptyArr, lastFromNonEmptyArr, updateWithJSONPointer } from "src/utils";
import { LangPreference, getDefaultLangPreferences } from "./lang.utils";

const JSON_LD_KEYWORDS = new Set(["@id", "@type", "@value", "@language", "@list", "@set", "@context"]);

export const getFirstTermOfJSONPath = (path: string) => path.match(/\$\.([^.[]+)/)![1] as string;

const sortLangPreferences = (langPreferences: LangPreference[]) =>
	langPreferences.sort(({ weight: a }, { weight: b }) => (b ?? 1) - (a ?? 1));

@Injectable()
export class LangService {

	constructor(private jsonLdService: JsonLdService) {}

	async contextualTranslateWith<T>(
		jsonLdContext: string,
		langPreferences: LangPreference[] = [{ lang: Lang.en }],
		selectedFields?: string[]
	) {
		langPreferences = sortLangPreferences(langPreferences);
		if (!langPreferences.length) {
			langPreferences = getDefaultLangPreferences();
		}
		if (firstFromNonEmptyArr(langPreferences).lang === Lang.multi) {
			return (item: T) => item;
		}

		let multiLangJSONPaths = await this.getMultiLangJSONPaths(jsonLdContext);

		if (selectedFields) {
			const selectedFieldsLookup = dictionarify(selectedFields);
			multiLangJSONPaths = multiLangJSONPaths.filter(path => selectedFieldsLookup[getFirstTermOfJSONPath(path)]);
		}

		return (item: T): T | MultiLangAsString<T> => {
			// It might be some item that is stored in local memory, so we need to make a copy so it won't become a mutant.
			item = instanceToInstance(item);
			multiLangJSONPaths.forEach(path => {
				JSONPath({
					path,
					json: item as any,
					resultType: "pointer",
					callback: (pointer: string, _: any, { parent, value }: any) => {
						updateWithJSONPointer(
							parent,
							`/${lastFromNonEmptyArr(pointer.split("/"))}`,
							getLangValue(value, langPreferences)
						);
					}
				});
			});
			return item;
		};
	}

	async translatorForLang<T extends HasJsonLdContext>(lang?: LangPreference[]) {
		return async (item: T): Promise<T | MultiLangAsString<T>> => {
			return (
				await this.contextualTranslateWith<T>(item["@context"], lang)
			)(item);
		};
	}

	async translate<T extends HasJsonLdContext>(item: T, lang?: LangPreference[]) : Promise<T | MultiLangAsString<T>> {
		return (
			await this.contextualTranslateWith<T>(item["@context"], lang)
		)(item);
	}

	@IntelligentMemoize()
	async getMultiLangJSONPaths(jsonLdContext: string): Promise<string[]> {
		return getMultiLangJSONPaths(await this.jsonLdService.getEmbeddedContext(jsonLdContext));
	}
}

const getLangValueWithFallback = (
	multiLangValue: MultiLang | undefined,
	langPreferences: (Omit<LangPreference, "lang"> & { lang: Lang })[]
): string | undefined | MultiLang => {
	if (!multiLangValue) {
		return undefined;
	}
	const langIdx = langPreferences.findIndex(LangPreference =>
		multiLangValue[LangPreference.lang as Exclude<Lang, Lang.multi>]
	);
	if (langIdx >= 0) {
		const fallbackLang = langPreferences[langIdx]!.lang;
		if (fallbackLang === Lang.multi) {
			return multiLangValue;
		}
		return multiLangValue[fallbackLang];
	}
};

function getLangValue(
	multiLangValue: MultiLang | undefined,
	langPreferences: LangPreference[]
): MultiLang | string | undefined {
	if (firstFromNonEmptyArr(langPreferences).lang === Lang.multi) {
		return multiLangValue;
	}
	if (!multiLangValue) {
		return undefined;
	}
	const fallback = shouldFallback(langPreferences);
	if (fallback) {
		langPreferences = [
			...langPreferences,
			{ lang: Lang.en, weight: -Infinity },
			{ lang: Lang.fi, weight: -Infinity },
			{ lang: Lang.sv, weight: -Infinity },
		];
	}
	const langValue = multiLangValue[firstFromNonEmptyArr(langPreferences).lang as Exclude<Lang, Lang.multi>];
	if (langValue !== undefined) {
		return langValue;
	}
	if (!fallback) {
		return undefined;
	}
	return getLangValueWithFallback(
		multiLangValue,
		// Omit '*' from lang because handled already
		langPreferences as (Omit<LangPreference, "lang"> & { lang: Lang })[]
	);
}

const shouldFallback = (langPreferences: LangPreference[]) =>
	langPreferences.every(lp => lp.lang !== "*" || lp.weight !== 0);

interface TranslateMaybeMultiLang {
	(value: MultiLang, lang: Lang): string | undefined;
	<T>(value: T, lang: Lang): T;
}

/**
 * If given value is a multilang object, it's lang value is returned. Otherwise, the value is returned as-is.
 *
 * This function is meant for data without JSON-LD context. Use the lang service for contextual data.
 */
export const translateMaybeMultiLang: TranslateMaybeMultiLang  =
	<T extends MultiLang | unknown>(value: T, lang: Lang): string | undefined | T => {
		if (isObject(value) && LANGS.some(lang => lang in value)) {
			return value[lang] as string | undefined;
		}
		return value as T;
	};

const getMultiLangJSONPaths = (jsonLdContext: JSONObjectSerializable): string[] => {
	const getMultiLangJSONPathsRecursively = (
		iteratedJsonLdContext: JSONObjectSerializable,
		iteratedJSONPath: string
	): string[] => {
		if (iteratedJsonLdContext["@container"] === "@set") {
			return getMultiLangJSONPathsRecursively(
				omit(iteratedJsonLdContext, "@container"),
				`${iteratedJSONPath}[*]`
			);
		} else if (iteratedJsonLdContext["@container"] === "@language") {
			return [iteratedJSONPath];
		// Detect an object with properties by checking if it has other properties than json-ld reserved keywords.
		} else if (Object.keys(iteratedJsonLdContext).some(key => !JSON_LD_KEYWORDS.has(key))) {
			return Object.keys(iteratedJsonLdContext).reduce((jsonPaths, key) => {
				if (JSON_LD_KEYWORDS.has(key)) {
					return jsonPaths;
				}
				return [...jsonPaths, ...getMultiLangJSONPathsRecursively(
					(iteratedJsonLdContext[key] as JSONObjectSerializable),
					`${iteratedJSONPath}.${key}`
				)];
			}, [] as string[]);
		}
		return [];
	};
	return (Object.keys(jsonLdContext) as (KeyOf<JsonLdDocument>)[]).reduce((jsonPaths, key) => {
		const value = jsonLdContext[key];
		if (!isJSONObjectSerializable(value)) {
			return jsonPaths;
		}
		return [
			...jsonPaths,
			...getMultiLangJSONPathsRecursively(value, `$.${key}`)
		];
	}, [] as string[]);
};
