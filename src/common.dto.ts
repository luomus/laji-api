import { Type } from "class-transformer";
import { IsInt, isObject } from "class-validator";
import { CommaSeparatedStrings, IsOptionalBoolean } from "./serializing/serializing";
import { IntersectionType } from "@nestjs/swagger";

export enum Lang {
	fi = "fi",
	sv = "sv",
	en = "en",
	multi = "multi",
}

export class PagedDto {
	@Type(() => Number)
	@IsInt()
	page?: number = 1;

	@Type(() => Number)
	@IsInt()
	pageSize?: number = 20;
}

export const isPagedQueryDto = (maybePagedQuery: any): maybePagedQuery is PagedDto =>
	isObject(maybePagedQuery) && ["page", "pageSize"] .every(k => k in maybePagedQuery);

export class LangQueryDto {
	lang?: Lang = Lang.en;
	@IsOptionalBoolean() langFallback?: boolean = true;
}

export const isLangQueryDto = (maybeLangQuery: any): maybeLangQuery is LangQueryDto =>
	isObject(maybeLangQuery) && ["lang", "langFallback"] .every(k => k in maybeLangQuery);

export class QueryWithPersonTokenDto {
	/** Person's authentication token */
	personToken: string;
}

export class GetPageDto extends IntersectionType(PagedDto, LangQueryDto) {
	/**
	 * Comma separated ids
	 */
	@CommaSeparatedStrings() idIn?: string[];
}

export class FindOneDto  {
	lang?: Lang = Lang.en;
	@IsOptionalBoolean() langFallback?: boolean = true;
}

export const LANGS: Exclude<Lang, Lang.multi>[] = [Lang.fi, Lang.sv, Lang.en];

export type CompleteMultiLang = Record<Exclude<Lang, Lang.multi>, string>;
export type MultiLang = Partial<CompleteMultiLang>;

export const pickFromMultiLang = (multiLangItem: MultiLang, lang: Exclude<Lang, Lang.multi>): (string | undefined) => {
	return multiLangItem[lang];
};

export class HasContext {
	"@context": string;
}
