import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, isObject } from "class-validator";
import { ParseOptionalBoolean } from "./serializing/serializing";
import { ApiProperty, IntersectionType } from '@nestjs/swagger';

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
	lang?: Lang = Lang.en;
}

export const isPagedQueryDto = (maybePagedQuery: any): maybePagedQuery is PagedDto => 
	isObject(maybePagedQuery) && ["page", "pageSize"] .every(k => k in maybePagedQuery);

export class LangQueryDto {
	lang?: Lang = Lang.en;
	// eslint-disable-next-line @typescript-eslint/no-inferrable-types
	@ParseOptionalBoolean()
	@IsBoolean()
	langFallback?: boolean = true;
}

export const isLangQueryDto = (maybeLangQuery: any): maybeLangQuery is LangQueryDto => 
	isObject(maybeLangQuery) && ["lang", "langFallback"] .every(k => k in maybeLangQuery);


export class QueryWithPersonTokenDto {
	/**
	 * Person's authentication token
	 */
	personToken: string;
}

export class GetPageDto extends IntersectionType(PagedDto, LangQueryDto) {
	/**
	 * Comma separated ids
	 */
	@ApiProperty({ type: String, required: false })
	@Transform(({ value }: { value: string }) => value.split(",").filter(id => !!id))
	idIn?: string[];
}

export class FindOneDto  {
	lang?: Lang = Lang.en;
	@ParseOptionalBoolean()
	@IsBoolean()
	langFallback?: boolean = true;
}

export const LANGS: Exclude<Lang, Lang.multi>[] = [Lang.fi, Lang.sv, Lang.en];

export type CompleteMultiLang = Record<Exclude<Lang, Lang.multi>, string>;
export type MultiLang = Partial<CompleteMultiLang>;

export const pickFromMultiLang = (multiLangItem: MultiLang, lang: Exclude<Lang, Lang.multi>): (string | undefined) => {
	return multiLangItem[lang];
}

export class HasContext {
	"@context": string;
}
