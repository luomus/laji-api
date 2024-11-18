import { AxiosRequestConfig } from "axios";
import { StoreConfig, StoreService } from "./store.service";
import { RestClientService } from "src/rest-client/rest-client.service";
import { getQueryVocabulary } from "./store-query";
import { uuid } from "src/utils";

describe("StoreService", () => {
	const mockHttp = {
		get: () => { },
		put: () => { },
		post: () => { },
		delete: () => { }
	};
	const mockRestConfig = { name: "mock" };

	/** Mimics Redis caches search wildcard with asterisk. */
	const createMockCache = () => {
		const cache: Record<string, unknown> = {};
		return {
			set: (key: string, value: unknown) => {
				cache[key] = value;
			},
			get: (key: string) => {
				return cache[key] ?? null;
			},
			del: (key: string) => {
				delete cache[key];
			},
			patternDel: (key: string) => {
				Object.keys(cache).forEach(k => {
					if (k.match(new RegExp("^" + key.replace(/\*/g, ".*") + "$"))) {
						delete cache[k];
					}
				});
			}
		};
	};

	const mockSetup = <T extends { id?: string }>(storeConfig: StoreConfig<T>) => {
		const mockRestClient = new RestClientService<any>(
			mockHttp as any, mockRestConfig as any, createMockCache() as any
		);
		const cache = createMockCache();
		const store = new StoreService<T>(mockRestClient, cache as any, storeConfig);
		jest.spyOn(mockRestClient, "get").mockImplementation((path: string, config: AxiosRequestConfig) => {
			const mockResult = (id: string) => ({ primary: "bar", id });
			if (path.startsWith(storeConfig.resource + "/")) {
				const id = path.replace(storeConfig + "/", "");
				return Promise.resolve(mockResult(id));
			} else if (path === "mockResource" && config.params?.page_size) {
				const arr = Array(config.params.page_size);
				for (const idx of arr.keys()) {
					arr[idx] = mockResult("" + idx);
				}
				return Promise.resolve({ member: arr });
			}
			throw new Error("Mock implementation missing");
		});
		jest.spyOn(mockRestClient, "post").mockImplementation(
			(path, item: object) => Promise.resolve({ ...item, id: uuid(3) })
		);
		jest.spyOn(mockRestClient, "put").mockImplementation((path: string, item: object) => Promise.resolve(item));
		jest.spyOn(mockRestClient, "delete").mockImplementation(() => Promise.resolve({}));

		return store;
	};

	describe("caching", () => {
		type Resource = { id: string, primary: string };

		describe("get()", () => {

			let store: StoreService<Resource>;
			beforeEach(async () => {
				store = mockSetup<Resource>({
					resource: "mockResource",
					cache: { keys: ["primary"], primaryKeys: ["primary"] },
				});
			});

			it("is cached", async () => {
				const result = await store.get("foo");
				expect(await store.get("foo")).toBe(result);
			});

			it("update() busts cache for get() by id", async () => {
				const result = await store.get("foo");
				await store.update({ primary: "bar", id: "foo" });
				expect(await store.get("primary")).not.toBe(result);
			});

			it("update() doesn't bust cache for get() by other id", async () => {
				const result = await store.get("primary");
				await store.update({ primary: "bar", id: "bar" });
				expect(await store.get("primary")).toBe(result);
			});

			it("delete() busts cache for get() by id", async () => {
				const result = await store.get("primary");
				await store.delete("primary");
				expect(await store.get("primary")).not.toBe(result);
			});
		});

		describe("getPage()", () => {

			describe("single primary key", () => {

				let store: StoreService<Resource>;
				beforeEach(async () => {
					store = mockSetup<Resource>({
						resource: "mockResource",
						cache: { keys: ["primary"], primaryKeys: ["primary"] },
					});
				});

				it("is cached", async () => {
					const result = await store.getPage({ primary: "bar" });
					expect(await store.getPage({ primary: "bar" })).toBe(result);
				});

				it("doesn't return other query", async () => {
					const result = await store.getPage({ primary: "bar" });
					const other = await store.getPage({ primary: "barbar" });
					expect(other).not.toBe(result);
					const anotherOne = await store.getPage({ primary: "barbarbar" });
					expect(anotherOne).not.toBe(result);
					expect(anotherOne).not.toBe(other);
				});

				it("doesn't return other page", async () => {
					const result = await store.getPage({ primary: "bar" }, 1, 20);
					const other = await store.getPage({ primary: "bar" }, 2, 20);
					expect(other).not.toBe(result);
				});

				it("doesn't return other page size", async () => {
					const result = await store.getPage({ primary: "bar" }, 1, 20);
					const other = await store.getPage({ primary: "bar" }, 1, 21);
					expect(other).not.toBe(result);
				});

				it("doesn't return other selectedFields", async () => {
					const result = await store.getPage({ primary: "bar" }, 1, 20);
					const other = await store.getPage({ primary: "bar" }, 1, 20, "primary");
					expect(other).not.toBe(result);
					const anotherOne = await store.getPage({ primary: "bar" }, 1, 20, "id");
					expect(anotherOne).not.toBe(result);
					expect(anotherOne).not.toBe(other);
				});

				it("create() into the query space busts cache", async () => {
					const result = await store.getPage({ primary: "bar" }, 1, 20);
					const other = await store.getPage({ primary: "bar" }, 1, 21);
					const anotherOne = await store.getPage({ primary: "bar" }, 1, 20, "id");

					await store.create({ primary: "bar" });
					expect(await store.getPage({ primary: "bar" }, 1, 20)).not.toBe(result);
					expect(await store.getPage({ primary: "bar" }, 1, 21)).not.toBe(other);
					expect(await store.getPage({ primary: "bar" }, 1, 20, "id")).not.toBe(anotherOne);
				});

				it("update() into the query space busts cache", async () => {
					const result = await store.getPage({ primary: "bar" }, 1, 20);
					const other = await store.getPage({ primary: "bar" }, 1, 21);
					const anotherOne = await store.getPage({ primary: "bar" }, 1, 20, "id");

					await store.update({ id: "foo", primary: "bar" });
					expect(await store.getPage({ primary: "bar" }, 1, 20)).not.toBe(result);
					expect(await store.getPage({ primary: "bar" }, 1, 21)).not.toBe(other);
					expect(await store.getPage({ primary: "bar" }, 1, 20, "id")).not.toBe(anotherOne);
				});

				it("update() busts cache for all non-primary keys that are in the primary key space", async () => {
					const result = await store.getPage({ primary: "bar" }, 1, 20);
					const other = await store.getPage({ primary: "bar" }, 1, 21);
					const anotherOne = await store.getPage({ primary: "bar" }, 1, 20, "id");

					await store.update({ id: "foo", primary: "bar" });
					expect(await store.getPage({ primary: "bar" }, 1, 20)).not.toBe(result);
					expect(await store.getPage({ primary: "bar" }, 1, 21)).not.toBe(other);
					expect(await store.getPage({ primary: "bar" }, 1, 20, "id")).not.toBe(anotherOne);
				});
			});

			describe("multiple primary keys", () => {

				type TwoPrimaries = { id: string, primary: string, primary2: string };
				let store: StoreService<TwoPrimaries>;
				beforeEach(async () => {
					store = mockSetup<TwoPrimaries>({
						resource: "mockResource",
						cache: {
							keys: ["primary", "primary2"],
							primaryKeys: ["primary", "primary2"]
						},
					});
				});

				it("crashes when querying without all primary keys", async () => {
					await expect(async () => await store.getPage({ primary: "bar" })).rejects.toThrowError();
				});

				it("is cached", async () => {
					const result = await store.getPage({ primary: "bar", primary2: "barbar" });
					expect(await store.getPage({ primary: "bar", primary2: "barbar" })).toBe(result);
				});

				it("doesn't return other query", async () => {
					const result = await store.getPage({ primary: "bar", primary2: "bar" });
					const other = await store.getPage({ primary: "barbar", primary2: "bar" });
					expect(other).not.toBe(result);
					const anotherOne = await store.getPage({ primary: "bar", primary2: "barbar" });
					expect(anotherOne).not.toBe(result);
					expect(anotherOne).not.toBe(other);
				});

				// eslint-disable-next-line max-len
				it("create() into the query space with shared primary value busts cache the entry with the same primary values", async () => {
					const result = await store.getPage({ primary: "bar", primary2: "bar" });
					const other = await store.getPage({ primary: "bar", primary2: "barbar" });
					const anotherOne = await store.getPage({ primary: "bar", primary2: "barbarbar" });
					await store.create({ primary: "bar", primary2: "bar" });
					expect(await store.getPage({ primary: "bar", primary2: "bar" })).not.toBe(result);
					expect(await store.getPage({ primary: "bar", primary2: "barbar" })).toBe(other);
					expect(await store.getPage({ primary: "bar", primary2: "barbarbar" })).toBe(anotherOne);
				});

				// eslint-disable-next-line max-len
				it("create() into the query space with only one shared primary value busts cache the entry with the same primary values", async () => {
					const result = await store.getPage({ primary: "bar", primary2: "bar" });
					const other = await store.getPage({ primary: "bar", primary2: "barbar" });
					const anotherOne = await store.getPage({ primary: "bar", primary2: "barbarbar" });
					await store.create({ primary: "bar" });
					expect(await store.getPage({ primary: "bar", primary2: "bar" })).toBe(result);
					expect(await store.getPage({ primary: "bar", primary2: "barbar" })).toBe(other);
					expect(await store.getPage({ primary: "bar", primary2: "barbarbar" })).toBe(anotherOne);
				});
			});

			describe("multiple primary keys multiple non-primary keys", () => {

				type PrimariesAndSecondaries = {
					id: string, primary: string, primary2: string, secondary: string, secondary2: string
				};
				let store: StoreService<PrimariesAndSecondaries>;

				beforeEach(async () => {
					store = mockSetup<PrimariesAndSecondaries>({
						resource: "mockResource",
						cache: {
							keys: ["primary", "primary2", "secondary", "secondary2"],
							primaryKeys: ["primary", "primary2"]
						},
					});
				});

				it("is cached", async () => {
					const result = await store.getPage({ primary: "bar", primary2: "barbar" });
					expect(await store.getPage({ primary: "bar", primary2: "barbar" })).toBe(result);
				});

				it("doesn't return other query when primaries equal but secondaries not", async () => {
					const result = await store.getPage({ primary: "bar", primary2: "bar", secondary: "foo" });
					const other = await store.getPage({ primary: "bar", primary2: "bar", secondary: "foofoo" });
					expect(other).not.toBe(result);
					const anotherOne = await store.getPage({ primary: "bar", primary2: "bar" });
					expect(anotherOne).not.toBe(result);
					expect(anotherOne).not.toBe(other);
				});

				// eslint-disable-next-line max-len
				it("create() into the query space with shared primary value busts cache the entry with the same primary values", async () => {
					const result = await store.getPage({ primary: "bar", primary2: "bar" });
					const other = await store.getPage({ primary: "bar", primary2: "barbar" });
					const anotherOne = await store.getPage({ primary: "bar", primary2: "barbarbar" });
					await store.create({ primary: "bar", primary2: "bar" });
					expect(await store.getPage({ primary: "bar", primary2: "bar" })).not.toBe(result);
					expect(await store.getPage({ primary: "bar", primary2: "barbar" })).toBe(other);
					expect(await store.getPage({ primary: "bar", primary2: "barbarbar" })).toBe(anotherOne);
				});

				// eslint-disable-next-line max-len
				it("create() into the query space with shared primary value busts cache for all secondary values in the same primary space", async () => {
					const primarySpace = { primary: "bar", primary2: "bar" };
					const res1 = await store.getPage({ ...primarySpace });
					const res2 = await store.getPage({ ...primarySpace, secondary: "foo" });
					// eslint-disable-next-line max-len
					const res3 = await store.getPage({ ...primarySpace, secondary: "foo", secondary2: "foo" });
					const res4 = await store.getPage({ ...primarySpace, secondary2: "foo" });

					await store.create({ ...primarySpace });
					expect(await store.getPage({ ...primarySpace })).not.toBe(res1);
					expect(await store.getPage({ ...primarySpace, secondary: "foo" })).not.toBe(res2);
					// eslint-disable-next-line max-len
					expect(await store.getPage({ ...primarySpace, secondary: "foo", secondary2: "foo" })).not.toBe(res3);
					expect(await store.getPage({ ...primarySpace, secondary2: "foo" })).not.toBe(res4);
				});

				// eslint-disable-next-line max-len
				it("create() into the query space with shared primary value doesn't busts cache for secondary values from other primary space", async () => {
					const primarySpace = { primary: "bar", primary2: "bar" };
					const res1 = await store.getPage({ ...primarySpace });
					const res2 = await store.getPage({ ...primarySpace, secondary: "foo" });
					const res3 = await store.getPage({ ...primarySpace, primary: "other space", secondary: "foo" });

					await store.create({ ...primarySpace });
					expect(await store.getPage({ ...primarySpace })).not.toBe(res1);
					expect(await store.getPage({ ...primarySpace, secondary: "foo" })).not.toBe(res2);
					// eslint-disable-next-line max-len
					expect(await store.getPage({ ...primarySpace, primary: "other space", secondary: "foo" })).toBe(res3);
				});

				// eslint-disable-next-line max-len
				it("create() into the query space with value without primary value doesn't busts cache the primary space of the missing value", async () => {
					const primarySpace = { primary: "bar", primary2: "bar" };
					const res1 = await store.getPage({ ...primarySpace });

					await store.create({ primary2: "bar" }); // it's missing primary: bar
					expect(await store.getPage({ ...primarySpace })).toBe(res1);
				});

				// eslint-disable-next-line max-len
				it("create() into the query space with value without primary value busts cache for the primary space of the 'not exists' space", async () => {
					const { and, not, exists } = getQueryVocabulary<PrimariesAndSecondaries>();
					const notExistsSpace = and(not({ primary: exists }), { primary2: "foo" });
					const res1 = await store.getPage(notExistsSpace);

					const primarySpace = { primary: "bar", primary2: "bar" };
					const res2 = await store.getPage({ ...primarySpace });

					await store.create({ primary2: "bar" }); // It's missing primary key, primary2 doesn't belong to the same space so shouldn't bust
					expect(await store.getPage(notExistsSpace)).toBe(res1);
					expect(await store.getPage({ ...primarySpace })).toBe(res2);

					await store.create({ primary2: "foo", secondary: "foo" }); // this shares the same primary space as res1, since 'primary' (=missing) and 'primary2' is same
					expect(await store.getPage(notExistsSpace)).not.toBe(res1);
					expect(await store.getPage({ ...primarySpace })).toBe(res2);
				});
			});

			describe("array query values", () => {

				type ArrayPrimary = {
					id: string, primary: string
				};
				let store: StoreService<ArrayPrimary>;
				beforeEach(async () => {
					store = mockSetup<ArrayPrimary>({
						resource: "mockResource",
						cache: {
							keys: ["primary"],
							primaryKeys: ["primary"]
						},
					});
				});

				// eslint-disable-next-line max-len
				it("create() into the query space with value in array busts", async () => {
					const result = await store.getPage({ primary: ["foo", "bar"] });
					const other = await store.getPage({ primary: "bar" });
					const anotherOne = await store.getPage({ primary: "foo" });
					await store.create({ primary: "bar" });
					expect(await store.getPage({ primary: ["foo", "bar"] })).not.toBe(result);
					expect(await store.getPage({ primary: "bar" })).not.toBe(other);
					expect(await store.getPage({ primary: "foo" })).toBe(anotherOne);
				});
			});

			describe("or query", () => {

				type TwoStringOneBool = {
					id: string, key: string, key2: string, bool: boolean
				};
				let store: StoreService<TwoStringOneBool>;
				const { or, not, exists } = getQueryVocabulary<TwoStringOneBool>();

				beforeEach(async () => {
					store = mockSetup<TwoStringOneBool>({
						resource: "mockResource",
						cache: {
							keys: ["key", "key2", "bool"]
						},
					});
				});

				// eslint-disable-next-line max-len
				it("create() into the query space with one of the or keys busts both", async () => {
					const result = await store.getPage(or({ key: "foo" }, { key2: "bar" }));
					await store.create({ key: "foo" });
					expect(await store.getPage(or({ key: "foo" }, { key2: "bar" }))).not.toBe(result);
				});

				// eslint-disable-next-line max-len
				it("create() into the query space with boolean type false or 'not exists' busts", async () => {
					const result = await store.getPage(or({ bool: false }, not({ bool: exists })));
					await store.create({ bool: false });
					expect(await store.getPage(or({ bool: false }, not({ bool: exists })))).not.toBe(result);
				});

				// eslint-disable-next-line max-len
				it("create() into the query space with boolean type false or 'not exists' doesn't bust", async () => {
					const result = await store.getPage(or({ bool: false }, not({ bool: exists })));
					await store.create({ bool: true });
					expect(await store.getPage(or({ bool: false }, not({ bool: exists })))).toBe(result);
				});
			});

			describe("multiple query spaces", () => {

				type ArrayPrimary = {
					id: string, primary: string
				};
				let store: StoreService<ArrayPrimary>;
				beforeEach(async () => {
					store = mockSetup<ArrayPrimary>({
						resource: "mockResource",
						cache: {
							keys: ["primary"],
							primaryKeySpaces: [
								[],
								["primary"]
							]
						},
					});
				});

				it("queries with different cache config don't use the same cache space", async () => {
					const result = await store.getPage({ primary: ["foo", "bar"] });
					const result2 = await store.getPage(
						{ primary: ["foo", "bar"] },
						undefined,
						undefined,
						undefined,
						{ primaryKeys: ["primary"] }
					);
					expect(result).not.toBe(result2);
				});

				it("querying twice with the same cache config is cached", async () => {
					const result = await store.getPage(
						{ primary: ["foo", "bar"] },
						undefined,
						undefined,
						undefined,
						{ primaryKeys: ["primary"] }
					);
					const result2 = await store.getPage(
						{ primary: ["foo", "bar"] },
						undefined,
						undefined,
						undefined,
						{ primaryKeys: ["primary"] }
					);
					expect(result).toBe(result2);
				});

				it("create() busts cache for all query spaces", async () => {
					const result = await store.getPage({ primary: ["foo", "bar"] });
					const result2 = await store.getPage(
						{ primary: ["foo", "bar"] },
						undefined,
						undefined,
						undefined,
						{ primaryKeys: ["primary"] }
					);
					await store.create({ primary: "bar" });
					expect(await store.getPage({ primary: ["foo", "bar"] })).not.toBe(result);
					expect(await store.getPage(
						{ primary: ["foo", "bar"] },
						undefined,
						undefined,
						undefined,
						{ primaryKeys: ["primary"] }
					)).not.toBe(result2);
				});

				it("create() busts cache for all query spaces more complex setup", async () => {
					type TwoPrimaries = {
						id: string, primary: string, primary2: string
					};
					const store = mockSetup<TwoPrimaries>({
						resource: "mockResource",
						cache: {
							keys: ["primary", "primary2"],
							primaryKeySpaces: [
								["primary"],
								["primary2"]
							]
						},
					});
					const { not, exists } = getQueryVocabulary<TwoPrimaries>();

					const result = await store.getPage(
						{ primary: ["foo", "bar"] },
						undefined,
						undefined,
						undefined,
						{ primaryKeys: ["primary"] }
					);
					const result2 = await store.getPage(
						not({ primary2: exists }),
						undefined,
						undefined,
						undefined,
						{ primaryKeys: ["primary2"] }
					);
					await store.create({ primary: "bar" });

					expect(await store.getPage(
						{ primary: ["foo", "bar"] },
						undefined,
						undefined,
						undefined,
						{ primaryKeys: ["primary"] }
					)).not.toBe(result);
					expect(await store.getPage(
						not({ primary2: exists }),
						undefined,
						undefined,
						undefined,
						{ primaryKeys: ["primary2"] }
					)).not.toBe(result2);
				});
			});

			// No need to cover all cases as it uses the getPage() logic
			describe("findOne() uses getPage() caching", () => {

				let store: StoreService<Resource>;
				beforeEach(async () => {
					store = mockSetup<Resource>({
						resource: "mockResource",
						cache: { keys: ["primary"], primaryKeys: ["primary"] },
					});
				});

				it("is cached", async () => {
					const result = await store.findOne({ primary: "bar" });
					expect(await store.findOne({ primary: "bar" })).toBe(result);
				});

				it("doesn't return other query", async () => {
					const result = await store.findOne({ primary: "bar" });
					const other = await store.findOne({ primary: "barbar" });
					expect(other).not.toBe(result);
				});

				it("create() into the query space busts cache", async () => {
					const result = await store.findOne({ primary: "bar" });
					await store.create({ primary: "bar" });
					expect(await store.findOne({ primary: "bar" })).not.toBe(result);
				});

				it("create() outside the query space doesn't bust cache", async () => {
					const result = await store.findOne({ primary: "bar" });
					await store.create({ primary: "barbar" });
					expect(await store.findOne({ primary: "bar" })).toBe(result);
				});

				it("update() into the query space busts cache", async () => {
					const result = await store.findOne({ primary: "bar" });
					await store.update({ id: "foo", primary: "bar" });
					expect(await store.findOne({ primary: "bar" })).not.toBe(result);
				});

				it("update() outside the query space doesn't bust cache", async () => {
					const result = await store.findOne({ primary: "bar" });
					await store.update({ id: "foo", primary: "barbar" });
					expect(await store.findOne({ primary: "bar" })).toBe(result);
				});

				it("delete() into the query space busts cache", async () => {
					const result = await store.getAll({ primary: "bar" });
					await store.delete("primary");
					expect(await store.getAll({ primary: "bar" })).not.toBe(result);
				});

				it("delete() outside the query space doesn't busts cache", async () => {
					const result = await store.getAll({ primary: "bar" });
					await store.delete("primary");
					expect(await store.getAll({ primary: "barbar" })).not.toBe(result);
				});
			});

			// No need to cover all cases as it uses the getPage() logic
			describe("getAll() uses getPage() caching", () => {

				let store: StoreService<Resource>;
				beforeEach(async () => {
					store = mockSetup<Resource>({
						resource: "mockResource",
						cache: { keys: ["primary"], primaryKeys: ["primary"] },
					});
				});

				it("is cached", async () => {
					const result = await store.getAll({ primary: "bar" });
					expect(await store.getAll({ primary: "bar" })).toBe(result);
				});

				it("doesn't return other query", async () => {
					const result = await store.getAll({ primary: "bar" });
					const other = await store.getAll({ primary: "barbar" });
					expect(other).not.toBe(result);
					const anotherOne = await store.getAll({ primary: "barbarbar" });
					expect(anotherOne).not.toBe(result);
					expect(anotherOne).not.toBe(other);
				});

				it("create() into the query space busts cache", async () => {
					const result = await store.getAll({ primary: "bar" });
					await store.create({ primary: "bar" });
					expect(await store.getAll({ primary: "bar" })).not.toBe(result);
				});

				it("update() into the query space busts cache", async () => {
					const result = await store.getAll({ primary: "bar" });
					await store.update({ id: "foo", primary: "bar" });
					expect(await store.getAll({ primary: "bar" })).not.toBe(result);
				});

				it("delete() into the query space busts cache", async () => {
					const result = await store.getAll({ primary: "bar" });
					await store.delete("primary");
					expect(await store.getAll({ primary: "bar" })).not.toBe(result);
				});
			});
		});
	});
});
