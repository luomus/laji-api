import { Type } from "class-transformer";
import { IsInt, IsString, isObject } from "class-validator";
import { CommaSeparatedStrings } from "src/serialization/serialization.utils";
import { PartialType } from "@nestjs/swagger";

export enum Lang {
	fi = "fi",
	sv = "sv",
	en = "en",
	multi = "multi",
}

export class QueryWithPagingDto {
	@Type(() => Number)
	@IsInt()
	page?: number = 1;

	@Type(() => Number)
	@IsInt()
	pageSize?: number = 20;
}

export const isQueryWithPagingDto = (maybePagedQuery: any): maybePagedQuery is QueryWithPagingDto =>
	isObject(maybePagedQuery) && ["page", "pageSize"] .every(k => k in maybePagedQuery);

export class QueryWithPersonTokenDto {
	/** Person's authentication token */
	@IsString() personToken: string;
}

export class QueryWithMaybePersonTokenDto extends PartialType(QueryWithPersonTokenDto) {}

export class QueryWithPagingAndIdIn {
	/**
	 * Comma separated ids
	 */
	@CommaSeparatedStrings() idIn?: string[];
}

export const LANGS: Exclude<Lang, Lang.multi>[] = [Lang.fi, Lang.sv, Lang.en];
export const LANGS_WITH_MULTI: Lang[] = [Lang.fi, Lang.sv, Lang.en, Lang.multi];

export type CompleteMultiLang = Record<Exclude<Lang, Lang.multi>, string>;
export type MultiLang = Partial<CompleteMultiLang>;

export class MultiLangDto {
	fi?: string;
	en?: string;
	sv?: string;
}

export const pickFromMultiLang = (multiLangItem: MultiLang, lang: Exclude<Lang, Lang.multi>): (string | undefined) => {
	return multiLangItem[lang];
};

export class HasJsonLdContext {
	"@context": string;
}

export type MultiLangAsString<T> = {
	[K in keyof T]: T[K] extends MultiLang
	? string
	: T[K] extends object
	? MultiLangAsString<T[K]>
	: T[K];
};

export class HasSelectedFields {
	/** Select fields to include in the result. Multiple values are separated by a comma (,) */
	@CommaSeparatedStrings() selectedFields?: string[];
}

