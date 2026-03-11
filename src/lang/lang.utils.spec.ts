import { getLangPreferences } from "./lang.utils";
import { Lang } from "../common.dto";

describe("Accept-Language parsing", () => {
	const mockRequest = (acceptLanguage?: string, query?: any) =>
    ({
    	headers: acceptLanguage ? { "accept-language": acceptLanguage } : {},
    	query: query || {},
    }) as any;

	it("weights are 1 by default", () => {
		const req = mockRequest("en,sv");
		const result = getLangPreferences(req);

		expect(result).toEqual([
			{ lang: Lang.en, weight: 1 },
			{ lang: Lang.sv, weight: 1 },
		]);
	});

	it("weight can be controlled", () => {
		const req = mockRequest("fi;q=0.5");

		const result = getLangPreferences(req);

		expect(result).toEqual([
			{ lang: Lang.fi, weight: 0.5 },
		]);
	});

	it("unknown langs are ignored", () => {
		const req = mockRequest("fi;q=0.5,en;q=0.2,sv,es");

		const result = getLangPreferences(req);

		expect(result).toEqual([
			{ lang: Lang.fi, weight: 0.5 },
			{ lang: Lang.en, weight: 0.2 },
			{ lang: Lang.sv, weight: 1 },
		]);
	});

	it("white space friendly", () => {
		const req = mockRequest("fi ; q=0.5, en;q=0.2, sv, es");

		const result = getLangPreferences(req);

		expect(result).toEqual([
			{ lang: Lang.fi, weight: 0.5 },
			{ lang: Lang.en, weight: 0.2 },
			{ lang: Lang.sv, weight: 1 },
		]);
	});

	it("supports *", () => {
		const req = mockRequest("fi;q=0.5,en;q=0.2,*;q=0");

		const result = getLangPreferences(req);

		expect(result).toEqual([
			{ lang: Lang.fi, weight: 0.5 },
			{ lang: Lang.en, weight: 0.2 },
			{ lang: "*", weight: 0 },
		]);
	});

	it("region variants simplified", () => {
		const req = mockRequest("en-US;q=0.2");

		const result = getLangPreferences(req);

		expect(result).toEqual([
			{ lang: Lang.en, weight: 0.2 },
		]);
	});
});
