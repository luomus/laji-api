import { HttpService } from "@nestjs/axios";
import { Test, TestingModule } from "@nestjs/testing";
import { RestClientService, RestClientConfig } from "./rest-client.service";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { of } from "rxjs";
import { JSONSerializable } from "src/typing.utils";
import { AxiosResponse } from "axios";
import { CACHE_1_D } from "src/utils";

const mockAxiosOkResponse = (data: JSONSerializable) => of({ data } as AxiosResponse);

describe("RestClientService", () => {
	describe("flushing", () => {
		describe("when singleResourceEndpoint = false", () => {
			let restClientService: RestClientService<unknown>;
			let httpService: HttpService;

			// singleResourceEndpoint should be false by default
			const config: RestClientConfig<unknown> = {
				name: "TestClient",
				host: "http://localhost",
				cache: CACHE_1_D
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

				restClientService = module.get<RestClientService<unknown>>(RestClientService);
				httpService = module.get<HttpService>(HttpService);
			});

			it("should flush on post", async () => {
				jest.spyOn(httpService, "get").mockImplementation(() => {
					return mockAxiosOkResponse({ data: "test" });
				});
				const cachedResult = await restClientService.get("path");
				jest.spyOn(httpService, "post").mockReturnValue(mockAxiosOkResponse({ data: "test" }));
				await restClientService.post("path", { data: "new" });
				expect(await restClientService.get("path")).not.toBe(cachedResult);
			});

			it("should flush on put", async () => {
				jest.spyOn(httpService, "get").mockImplementation(() => {
					return mockAxiosOkResponse({ data: "test" });
				});
				const cachedResult = await restClientService.get("path");
				jest.spyOn(httpService, "put").mockReturnValue(mockAxiosOkResponse({ data: "test" }));
				await restClientService.put("path", { data: "update" });
				expect(await restClientService.get("path")).not.toBe(cachedResult);
			});

			it("should flush on delete", async () => {
				jest.spyOn(httpService, "get").mockImplementation(() => {
					return mockAxiosOkResponse({ data: "test" });
				});
				const cachedResult = await restClientService.get("path");
				jest.spyOn(httpService, "delete").mockReturnValue(mockAxiosOkResponse({ data: "test" }));
				await restClientService.delete("path");
				expect(await restClientService.get("path")).not.toBe(cachedResult);
			});

			it("should flush all gets of the same path but different query parameters", async () => {
				jest.spyOn(httpService, "get").mockImplementation(() => {
					return mockAxiosOkResponse({ data: "test" });
				});
				const cachedResult = await restClientService.get("path");
				const cachedResult2 = await restClientService.get("path", { params: { foo: "bar" } });
				jest.spyOn(httpService, "post").mockReturnValue(mockAxiosOkResponse({ data: "new" }));
				await restClientService.post("path", { data: "new" });
				expect(await restClientService.get("path")).not.toBe(cachedResult);
				expect(await restClientService.get("path", { params: { foo: "bar" } })).not.toBe(cachedResult2);
			});
		});

		describe("when singleResourceEndpoint = true", () => {
			let restClientService: RestClientService<any>;
			let httpService: HttpService;

			const mockConfig: RestClientConfig<any> = {
				name: "TestClient",
				host: "https://test.api",
				singleResourceEndpoint: true
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

				restClientService = module.get<RestClientService<any>>(RestClientService);
				httpService = module.get<HttpService>(HttpService);
			});

			it("should flush cache on post", async () => {
				jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "test" }));
				const cachedResult = await restClientService.get("path");

				jest.spyOn(httpService, "post").mockReturnValue(mockAxiosOkResponse({ data: "created" }));
				await restClientService.post("path", { name: "New Item" });

				expect(await restClientService.get("path")).not.toBe(cachedResult);
			});

			it("should flush cache on put", async () => {
				jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "test" }));
				const cachedResult = await restClientService.get("path");

				jest.spyOn(httpService, "put").mockReturnValue(mockAxiosOkResponse({ data: "updated" }));
				await restClientService.put("path", { name: "Updated Item" });

				expect(await restClientService.get("path")).not.toBe(cachedResult);
			});

			it("should flush cache on delete", async () => {
				jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "test" }));
				const cachedResult = await restClientService.get("path");

				jest.spyOn(httpService, "delete").mockReturnValue(mockAxiosOkResponse({ data: "deleted" }));
				await restClientService.delete("path");

				expect(await restClientService.get("path")).not.toBe(cachedResult);
			});

			it("should flush all gets of the same path but different query parameters", async () => {
				jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "test" }));
				const cachedResult = await restClientService.get("path");
				const cachedResult2 = await restClientService.get("path", { params: { foo: "bar" } });

				jest.spyOn(httpService, "post").mockReturnValue(mockAxiosOkResponse({ data: "new" }));
				await restClientService.post("path", { data: "new" });

				expect(await restClientService.get("path")).not.toBe(cachedResult);
				expect(await restClientService.get("path", { params: { foo: "bar" } })).not.toBe(cachedResult2);
			});
		});
	});

	describe("inflight request deduplication", () => {
		describe("when singleResourceEndpoint = false", () => {
			let restClientService: RestClientService<unknown>;
			let httpService: HttpService;

			// singleResourceEndpoint should be false by default
			const config: RestClientConfig<unknown> = {
				name: "TestClient",
				host: "http://localhost",
				cache: CACHE_1_D
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

				restClientService = module.get<RestClientService<unknown>>(RestClientService);
				httpService = module.get<HttpService>(HttpService);
			});

			it("request should be cached", async () => {
				jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "test" }));
				const request = restClientService.get("path");
				expect(await restClientService.get("path")).toBe(await request);
			});

			it("should flush on post", async () => {
				jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "test" }));
				const request = restClientService.get("path");
				jest.spyOn(httpService, "post").mockReturnValue(mockAxiosOkResponse({ data: "test" }));
				const post = restClientService.post("path", { data: "new" });
				const requestAgain = restClientService.get("path");
				const req1Result = await request;
				await post;
				const req2Result = await requestAgain;
				expect(req2Result).not.toBe(req1Result);
			});

			it("should flush on put", async () => {
				jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "test" }));
				const request = restClientService.get("path");
				jest.spyOn(httpService, "put").mockReturnValue(mockAxiosOkResponse({ data: "test" }));
				const put =  restClientService.put("path", { data: "new" });
				const requestAgain = restClientService.get("path");
				const req1Result = await request;
				await put;
				const req2Result = await requestAgain;
				expect(req2Result).not.toBe(req1Result);
			});

			it("should flush on delete", async () => {
				jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "test" }));
				const request = restClientService.get("path");
				jest.spyOn(httpService, "delete").mockReturnValue(mockAxiosOkResponse({ data: "test" }));
				const del = restClientService.delete("path", { data: "new" });
				const requestAgain = restClientService.get("path");
				const req1Result = await request;
				await del;
				const req2Result = await requestAgain;
				expect(req2Result).not.toBe(req1Result);
			});

			it("should flush all gets of the same path but different query parameters", async () => {
				jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "test" }));
				const request = restClientService.get("path");
				const request2 = restClientService.get("path", { params: { foo: "bar" } });
				jest.spyOn(httpService, "post").mockReturnValue(mockAxiosOkResponse({ data: "new" }));
				const post = restClientService.post("path", { data: "new" });
				const requestAgain = restClientService.get("path");
				const request2Again = restClientService.get("path", { params: { foo: "bar" } });
				const req1Result = await request;
				const req2Result = await request2;
				await post;
				const reqAgainResult = await requestAgain;
				const req2AgainResult = await request2Again;
				expect(reqAgainResult).not.toBe(req1Result);
				expect(req2AgainResult).not.toBe(req2Result);
			});
		});
	});

	describe("stale-while-revalidate", () => {
		let restClientService: RestClientService<any>;
		let httpService: HttpService;

		const ttl = 1000;

		const config: RestClientConfig<any> = {
			name: "TestClient",
			host: "http://localhost",
			cache: ttl
		};

		beforeEach(async () => {
			jest.spyOn(Date, "now").mockReturnValue(0);

			const mockCache: Record<string, any> = {};
			const mockCacheService = {
				set: jest.fn((key: string, value: unknown) => {
					mockCache[key] = value;
				}),
				get: jest.fn((key: string) => {
					return mockCache[key] ?? null;
				}),
				del: jest.fn((key: string) => {
					delete mockCache[key];
				})
			};

			const module: TestingModule = await Test.createTestingModule({
				providers: [
					RestClientService,
					{
						provide: HttpService,
						useValue: {
							get: jest.fn(),
							post: jest.fn(),
							put: jest.fn(),
							delete: jest.fn()
						}
					},
					{ provide: RedisCacheService, useValue: mockCacheService },
					{ provide: "REST_CLIENT_CONFIG", useValue: config }
				]
			}).compile();

			restClientService = module.get(RestClientService);
			httpService = module.get(HttpService);
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it("returns cached value and does NOT revalidate when cache is fresh", async () => {
			jest.spyOn(httpService, "get").mockReturnValue(mockAxiosOkResponse({ data: "foo" }));
			const result = await restClientService.get("path");
			jest.spyOn(Date, "now").mockReturnValue(ttl - 10);
			jest.spyOn(httpService, "get").mockReturnValue(mockAxiosOkResponse({ data: "bar" }));
			const result2 = await restClientService.get("path");
			expect(result).toBe(result2);
		});

		it("returns cached value and revalidates in background when cache is stale", async () => {
			jest.spyOn(httpService, "get").mockReturnValue(mockAxiosOkResponse({ data: "foo" }));
			const result = await restClientService.get("path");
			jest.spyOn(Date, "now").mockReturnValue(ttl + 1);
			jest.spyOn(httpService, "get").mockReturnValue(mockAxiosOkResponse({ data: "bar" }));
			const result2 = await restClientService.get("path");
			expect(result2).toBe(result); // Immediate response is stale value
			const result3 = await restClientService.get("path"); // Returns fresh after revalidated in background
			expect(result3).not.toBe(result);
		});

		it("does not use stale-while-revalidate when cache is 0", async () => {
			jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "foo" }));
			const result = await restClientService.get("path");
			jest.spyOn(httpService, "get").mockImplementation(() => mockAxiosOkResponse({ data: "bar" }));
			const result2 = await restClientService.get("path", undefined, { cache: 0 });
			expect(result).not.toEqual(result2);
			expect(httpService.get).toHaveBeenCalledTimes(2);
		});
	});
});
