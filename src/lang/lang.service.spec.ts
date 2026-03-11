import { getFirstTermOfJSONPath } from "./lang.service";
import { Test, TestingModule } from "@nestjs/testing";
import { LangService } from "./lang.service";
import { JsonLdService } from "../json-ld/json-ld.service";
import { Lang } from "../common.dto";

describe("getFirstTermOfJSONPath()", () => {
	it("works with only one-level property", () => {
		expect(getFirstTermOfJSONPath("$.first")).toBe("first");
	});

	it("works with dot separated second term", () => {
		expect(getFirstTermOfJSONPath("$.first.second")).toBe("first");
	});

	it("works with dot separated many terms", () => {
		expect(getFirstTermOfJSONPath("$.first.second.third")).toBe("first");
	});

	it("works with square bracket separated second term", () => {
		expect(getFirstTermOfJSONPath("$.first[*]")).toBe("first");
	});

	it("works with square bracket separated second term when there's more stuff after the square bracket", () => {
		expect(getFirstTermOfJSONPath("$.first[*].second")).toBe("first");
	});
});

describe("LangService", () => {
	let langService: LangService;

	const mockJsonLdService = {
		getEmbeddedContext: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LangService,
				{
					provide: JsonLdService,
					useValue: mockJsonLdService,
				},
			],
		}).compile();

		langService = module.get<LangService>(LangService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("translate", () => {
		it("should translate multilang fields based on lang preference", async () => {
			mockJsonLdService.getEmbeddedContext.mockResolvedValue({
				name: { "@container": "@language" },
			});

			const item = {
				"@context": "http://test/context",
				name: { en: "Hello", fi: "Moi" },
			};

			const result = await langService.translate(item, [{ lang: Lang.fi }]);

			expect(result.name).toBe("Moi");
		});

		it("should fallback according to lang preferences", async () => {
			mockJsonLdService.getEmbeddedContext.mockResolvedValue({
				name: { "@container": "@language" },
			});

			const item = {
				"@context": "http://test/context",
				name: { en: "Hello", fi: "Moi" },
			};

			const result = await langService.translate(item, [
				{ lang: Lang.fi, weight: 0.5 },
				{ lang: Lang.en, weight: 1 }
			]);

			expect(result.name).toBe("Hello");
		});

		it("should fallback to non specified if * with weight 0 not present", async () => {
			mockJsonLdService.getEmbeddedContext.mockResolvedValue({
				name: { "@container": "@language" },
			});

			const item = {
				"@context": "http://test/context",
				name: { en: "Hello", fi: "Moi" },
			};

			const result = await langService.translate(item, [
				{ lang: Lang.sv, weight: 0.5 },
			]);

			expect(result.name).toBe("Hello");
		});

		it("should not fallback at all if * with weight 0 present", async () => {
			mockJsonLdService.getEmbeddedContext.mockResolvedValue({
				name: { "@container": "@language" },
			});

			const item = {
				"@context": "http://test/context",
				name: { en: "Hello", fi: "Moi" },
			};

			const result = await langService.translate(item, [
				{ lang: "*", weight: 0 },
				{ lang: Lang.sv, weight: 0.5 },
			]);

			expect(result.name).toBe(undefined);
		});
	});

	describe("getMultiLangJSONPaths", () => {
		it("should detect multilang JSON-LD paths", async () => {
			mockJsonLdService.getEmbeddedContext.mockResolvedValue({
				title: { "@container": "@language" },
				nested: {
					description: { "@container": "@language" },
				},
				items: {
					"@container": "@set",
					item: { "@container": "@language" },
				},
			});

			const paths = await langService.getMultiLangJSONPaths("http://test/context");

			expect(paths).toEqual(
				expect.arrayContaining([
					"$.title",
					"$.nested.description",
					"$.items[*].item",
				])
			);
		});
	});
});
