import { HttpService } from "@nestjs/axios";
import { Test, TestingModule } from "@nestjs/testing";
import { RestClientService, RestClientConfig } from "./rest-client.service";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { of } from "rxjs";
import { JSONSerializable } from "src/typing.utils";
import { AxiosResponse } from "axios";

const mockAxiosOkResponse = (data: JSONSerializable) => of({ data } as AxiosResponse);

describe("RestClientService", () => {
	describe("caching", () => {
		describe("when singleResourceEndpoint = false", () => {
			let restClientService: RestClientService<unknown>;
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
});
