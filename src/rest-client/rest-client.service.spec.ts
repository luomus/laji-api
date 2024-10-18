import { HttpService } from "@nestjs/axios";
import { Test, TestingModule } from "@nestjs/testing";
import { RestClientService, RestClientConfig } from "./rest-client.service";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { of } from "rxjs";
import { JSONSerializable } from "src/typing.utils";
import { AxiosResponse } from "axios";

const mockAxiosOkResponse = (data: JSONSerializable) => of({ data } as AxiosResponse);

describe("RestClientService caching", () => {
	describe("when singleResourceEndpoint = false", () => {
		let service: RestClientService<unknown>;
		let httpService: HttpService;

		const config: RestClientConfig<unknown> = {
			name: "TestClient",
			host: "http://localhost",
			cache: true // singleResourceEndpoint should be false by default
		};

		beforeEach(async () => {
			const mockCache: Record<string, unknown> = {};
			const mockCacheService = {
				set: (key: string, value: unknown) => {
					mockCache[key] = value;
				},
				get: (key: string) => {
					return mockCache[key] ?? null;
				},
				del: (key: string) => {
					delete mockCache[key];
				}
			};
			const module: TestingModule = await Test.createTestingModule({
				providers: [
					RestClientService,
					{ provide: HttpService, useValue: {
						get: jest.fn(),
						post: jest.fn(),
						put: jest.fn(),
						delete: jest.fn()
					} },
					{ provide: RedisCacheService, useValue: mockCacheService },
					{ provide: "REST_CLIENT_CONFIG", useValue: config },
				],
			}).compile();

			service = module.get<RestClientService<unknown>>(RestClientService);
			httpService = module.get<HttpService>(HttpService);
		});

		it("should flush on create", async () => {
			jest.spyOn(httpService, "get").mockImplementation(() => {
				    return mockAxiosOkResponse({ data: "test" });
			});
			const cachedResult = await service.get("path");
			jest.spyOn(httpService, "post").mockReturnValue(mockAxiosOkResponse({ data: "test" }));
			await service.post("path", { data: "new" });
			expect(await service.get("path")).not.toBe(cachedResult);
		});

		it("should flush on update", async () => {
			jest.spyOn(httpService, "get").mockImplementation(() => {
				    return mockAxiosOkResponse({ data: "test" });
			});
			const cachedResult = await service.get("path");
			jest.spyOn(httpService, "put").mockReturnValue(mockAxiosOkResponse({ data: "test" }));
			await service.put("path", { data: "update" });
			expect(await service.get("path")).not.toBe(cachedResult);
		});

		it("should flush on delete", async () => {
			jest.spyOn(httpService, "get").mockImplementation(() => {
				    return mockAxiosOkResponse({ data: "test" });
			});
			const cachedResult = await service.get("path");
			jest.spyOn(httpService, "delete").mockReturnValue(mockAxiosOkResponse({ data: "test" }));
			await service.delete("path");
			expect(await service.get("path")).not.toBe(cachedResult);
		});

		it("should flush all gets of same path but different query parameters", async () => {
			jest.spyOn(httpService, "get").mockImplementation(() => {
				    return mockAxiosOkResponse({ data: "test" });
			});
			const cachedResult = await service.get("path");
			const cachedResult2 = await service.get("path", { params: { foo: "bar" } });
			jest.spyOn(httpService, "post").mockReturnValue(mockAxiosOkResponse({ data: "new" }));
			await service.post("path", { data: "new" });
			expect(await service.get("path")).not.toBe(cachedResult);
			expect(await service.get("path", { params: { foo: "bar" } })).not.toBe(cachedResult2);
		});
	});

	describe("when singleResourceEndpoint = true", () => {
		let service: RestClientService<any>;
		let httpService: HttpService;

		const mockConfig: RestClientConfig<any> = {
			name: "TestClient",
			host: "https://test.api",
			cache: { singleResourceEndpoint: true },
		};

		beforeEach(async () => {
			const mockCache: Record<string, unknown> = {};
			const mockCacheService = {
				set: (key: string, value: unknown) => {
					mockCache[key] = value;
				},
				get: (key: string) => {
					return mockCache[key] ?? null;
				},
				del: (key: string) => {
					delete mockCache[key];
				}
			};

			const module: TestingModule = await Test.createTestingModule({
				providers: [
					RestClientService,
					{
						provide: "REST_CLIENT_CONFIG",
						useValue: mockConfig
					},
					{
						provide: RedisCacheService,
						useValue: mockCacheService
					},
					{
						provide: HttpService,
						useValue: {
							get: jest.fn(),
							post: jest.fn(),
							put: jest.fn(),
							delete: jest.fn()
						}
					}
				]
			}).compile();

			service = module.get<RestClientService<any>>(RestClientService);
			httpService = module.get<HttpService>(HttpService);
		});

		it("should flush cache on post", async () => {
			jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "test" }));
			const cachedResult = await service.get("path");

			jest.spyOn(httpService, "post").mockReturnValue(mockAxiosOkResponse({ data: "created" }));
			await service.post("path", { name: "New Item" });

			expect(await service.get("path")).not.toBe(cachedResult);
		});

		it("should flush cache on put", async () => {
			jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "test" }));
			const cachedResult = await service.get("path");

			jest.spyOn(httpService, "put").mockReturnValue(mockAxiosOkResponse({ data: "updated" }));
			await service.put("path", { name: "Updated Item" });

			expect(await service.get("path")).not.toBe(cachedResult);
		});

		it("should flush cache on delete", async () => {
			jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "test" }));
			const cachedResult = await service.get("path");

			jest.spyOn(httpService, "delete").mockReturnValue(mockAxiosOkResponse({ data: "deleted" }));
			await service.delete("path");

			expect(await service.get("path")).not.toBe(cachedResult);
		});

		it("should flush all gets of same path but different query parameters", async () => {
			jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "test" }));
			const cachedResult = await service.get("path");
			const cachedResult2 = await service.get("path", { params: { foo: "bar" } });

			jest.spyOn(httpService, "post").mockReturnValue(mockAxiosOkResponse({ data: "new" }));
			await service.post("path", { data: "new" });

			expect(await service.get("path")).not.toBe(cachedResult);
			expect(await service.get("path", { params: { foo: "bar" } })).not.toBe(cachedResult2);
		});
	});
});
