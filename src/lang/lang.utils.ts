import { HttpException } from "@nestjs/common";
import { Lang, LANGS_WITH_MULTI, MultiLang } from "src/common.dto";
import { Request } from "src/request";
import { firstFromNonEmptyArr } from "src/utils";

export const pickFromMultiLang = (multiLangItem: MultiLang, lang: Exclude<Lang, Lang.multi>): (string | undefined) => {
	return multiLangItem[lang];
};

export const getDefaultLangPreferences = () => [{ lang: Lang.en }, { lang: Lang.fi }, { lang: Lang.sv }];

export const getLangPreferences = (request: Request): LangPreference[] => {
	const { query, headers } = request;
	if (query.lang) {
		return [{ lang: parseLangFromQuery(query.lang as string) }];
	}
	const acceptLanguage = headers["accept-language"];
	if (acceptLanguage) {
		return parseLangFromHeader(acceptLanguage.replace(/ /g, ""));
	}
	return getDefaultLangPreferences();
};

const parseLangFromQuery = (lang: string) => {
	const validLang = LANGS_WITH_MULTI.find(l => lang === l);
	if (!validLang) {
		throw new HttpException(`Unknown lang query parameter ${lang}`, 422);
	}
	return validLang;
};

const parseLangFromHeader = (acceptLanguage: string): LangPreference[] => {
	return parseLangPreference(acceptLanguage);
};

const parseLangPreference = (acceptLanguage?: string) => {
	if (!acceptLanguage) {
		return getDefaultLangPreferences();
	}
	return acceptLanguage.split(",").reduce((langPreferences, langAndMaybeWeight) => {
		const splitted = langAndMaybeWeight.split(";q=");
		const lang = firstFromNonEmptyArr(splitted).replace(/-.+/, ""); // Rm region variants.
		const weight = Number(splitted[1] ?? "1");
		if (![...LANGS_WITH_MULTI, "*"].includes(lang as any)) {
			return langPreferences;
		}
		if (isNaN(weight)) {
			// eslint-disable-next-line max-len
			throw new HttpException(`Bad quality value ${splitted[1]} in Accept-Language header (${langAndMaybeWeight}). See https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept-Language`, 422);
		}
		langPreferences.push({ lang: lang as Lang, weight });
		return langPreferences;
	}, [] as LangPreference[]);
};

export const getDominantLang = (langPreferences: LangPreference[]): Lang =>
	langPreferences.find(({ lang }) => lang !== "*")!.lang as Lang;

export type LangPreference = {
	lang: Lang | "*";
	weight?: number;
}
