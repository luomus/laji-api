import { Injectable } from "@nestjs/common";
import { CompleteMultiLang, HasJsonLdContext, Lang, LANGS, MultiLang, MultiLangAsString } from "src/common.dto";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { isJSONObjectSerializable, isObject, JSONObjectSerializable, KeyOf, omit } from "src/typing.utils";
import { JSONPath } from "jsonpath-plus";
import { JsonLdService } from "src/json-ld/json-ld.service";
import { JsonLdDocument } from "jsonld";
import { instanceToInstance } from "class-transformer";
import { dictionarify, lastFromNonEmptyArr, updateWithJSONPointer } from "src/utils";

const LANG_FALLBACKS: (Lang.en | Lang.fi)[] = [Lang.en, Lang.fi];

const JSON_LD_KEYWORDS = new Set(["@id", "@type", "@value", "@language", "@list", "@set", "@context"]);

export const getFirstTermOfJSONPath = (path: string) => path.match(/\$\.([^.[]+)/)![1] as string;

@Injectable()
export class LangService {

	constructor(private jsonLdService: JsonLdService) {}

	async contextualTranslateWith<T>(
		jsonLdContext: string, lang?: Exclude<Lang, Lang.multi>, selectedFields?: string[]
	) : Promise<(item: T) => MultiLangAsString<T>>
	async contextualTranslateWith<T>(
		jsonLdContext: string, lang: Lang.multi, selectedFields?: string[]
	) : Promise<(item: T) => T>
	async contextualTranslateWith<T>(
		jsonLdContext: string, lang?: Lang, selectedFields?: string[]
	) : Promise<(item: T) => (T | MultiLangAsString<T>)>
	async contextualTranslateWith<T>(
		jsonLdContext: string, lang: Lang = Lang.en, selectedFields?: string[]
	) {
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
							getLangValue(value, lang)
						);
					}
				});
			});
			return item;
		};
	}

	async translate<T extends HasJsonLdContext>(item: T, lang: Exclude<Lang, Lang.multi>): Promise<MultiLangAsString<T>>
	async translate<T extends HasJsonLdContext>(item: T, lang?: Lang.multi): Promise<T>
	async translate<T extends HasJsonLdContext>(item: T, lang?: Lang): Promise<T | MultiLangAsString<T>>
	async translate<T extends HasJsonLdContext>(item: T, lang?: Lang) : Promise<T | MultiLangAsString<T>> {
		return (
			await this.contextualTranslateWith<T>(item["@context"], lang)
		)(item);
	}

	@IntelligentMemoize()
	async getMultiLangJSONPaths(jsonLdContext: string): Promise<string[]> {
		const embeddedJsonLdContext = await this.jsonLdService.getEmbeddedContext(jsonLdContext);
		return getMultiLangJSONPaths(embeddedJsonLdContext);
	}
}

const getLangValueWithFallback = (multiLangValue?: MultiLang): string | undefined => {
	if (!multiLangValue) {
		return undefined;
	}
	const langIdx = LANG_FALLBACKS.findIndex(lang => multiLangValue[lang]);
	if (langIdx >= 0) {
		const fallbackLang = LANG_FALLBACKS[langIdx]!;
		return multiLangValue[fallbackLang];
	}
};

const getMultiLangValue = (multiLangValue?: MultiLang): CompleteMultiLang | undefined => {
	const completeMultiLang = LANGS.reduce((multiLangValueFilled: CompleteMultiLang, lang) => {
		const value = multiLangValue?.[lang];
		multiLangValueFilled[lang] = value === undefined
			? getLangValueWithFallback(multiLangValue) ?? ""
			: value;
		return multiLangValueFilled;
	}, {} as CompleteMultiLang);
	return (Object.keys(completeMultiLang) as (keyof CompleteMultiLang)[]).every(k => completeMultiLang[k] === "")
		? undefined
		: completeMultiLang;
};

function getLangValue(multiLangValue: MultiLang | undefined, lang: Lang.multi): CompleteMultiLang;
function getLangValue(multiLangValue?: MultiLang, lang?: Exclude<Lang, Lang.multi>): string | undefined;
function getLangValue(multiLangValue?: MultiLang, lang?: Lang): CompleteMultiLang | string | undefined;
function getLangValue(multiLangValue?: MultiLang, lang: Lang = Lang.en)
	: CompleteMultiLang | string | undefined {
	if (lang === Lang.multi) {
		return getMultiLangValue(multiLangValue);
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
