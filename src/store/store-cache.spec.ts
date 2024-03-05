import { getQueryVocabulary } from "./store-query";
import { getCacheKeyForQuery, getCacheKeyForResource } from "./store-cache";

type Schema = { collectionID: string, public: boolean, owner: string };

const { and, or, exists, not } = getQueryVocabulary<Schema>();

const keys = ["collectionID", "public", "owner"] as (keyof Schema)[];

describe("Store query cache", () => {

	const config = { keys, primaryKeys: [] };

	describe("getCacheKeyForQuery", () => {
		it("has all keys", () => {
			expect(getCacheKeyForQuery<Schema>({ }, config))
				.toBe("key_collectionID:;*;key_owner:;*;key_public:;*;");
		});

		it("adds simple literal", () => {
			expect(getCacheKeyForQuery<Schema>({ collectionID: "HR.61" }, config))
				.toBe("key_collectionID:;HR.61;key_owner:;*;key_public:;*;");
		});

		it("adds literal array", () => {
			expect(getCacheKeyForQuery<Schema>({ collectionID: ["HR.61", "HR.21"] }, config))
				.toBe("key_collectionID:;HR.21;HR.61;key_owner:;*;key_public:;*;");
		});

		it("adds multiple fields", () => {
			expect(getCacheKeyForQuery<Schema>({ collectionID: "HR.61", owner: "bilbo" }, config))
				.toBe("key_collectionID:;HR.61;key_owner:;bilbo;key_public:;*;");
		});

		it("exists as asterisk", () => {
			expect(getCacheKeyForQuery<Schema>({ collectionID: exists, owner: "bilbo" }, config))
				.toBe("key_collectionID:;*;key_owner:;bilbo;key_public:;*;");
		});

		it("flattens AND", () => {
			expect(getCacheKeyForQuery<Schema>(and({ collectionID: "HR.61" }, { owner: "bilbo" }), config))
				.toBe("key_collectionID:;HR.61;key_owner:;bilbo;key_public:;*;");
		});

		it("flattens OR", () => {
			expect(getCacheKeyForQuery<Schema>(or({ collectionID: "HR.61" }, { owner: "bilbo" }), config))
				.toBe("key_collectionID:;HR.61;key_owner:;bilbo;key_public:;*;");
		});

		it("flattening joins values", () => {
			expect(getCacheKeyForQuery<Schema>(
				and({ collectionID: "HR.61" }, { collectionID: "HR.21", owner: "bilbo" }), config))
				.toBe("key_collectionID:;HR.21;HR.61;key_owner:;bilbo;key_public:;*;");
		});

		it("flattens deeper higher clause", () => {
			expect(getCacheKeyForQuery<Schema>(
				or({ collectionID: "HR.61" }, and({ public: true, owner: "bilbo" })), config))
				.toBe("key_collectionID:;HR.61;key_owner:;bilbo;key_public:;true;");
		});

		it("not exists as \"no_(prop)\"", () => {
			expect(getCacheKeyForQuery<Schema>(
				and(not({ collectionID: exists }), { owner: "bilbo" }), config))
				.toBe("no_collectionID;key_owner:;bilbo;key_public:;*;");
		});
	});

	describe("getCacheKeyForResource", () => {
		it("All undefined keys as asterisk", () => {
			expect(getCacheKeyForResource<Schema>({ }, { keys, primaryKeys: [] }))
				.toBe("key_collectionID:*key_owner:*key_public:*");
		});

		it("all other than primary keys use just asterisk", () => {
			expect(getCacheKeyForResource<Schema>(
				{ collectionID: "HR.61", owner: "bilbo" }, { keys, primaryKeys: ["collectionID"] }))
				.toBe("key_collectionID:*;HR.61;*key_owner:*key_public:*");
		});

		it("primary key searches the inclusive space if it has value", () => {
			expect(getCacheKeyForResource<Schema>(
				{ collectionID: "HR.61", owner: "bilbo" }, { keys, primaryKeys: ["collectionID"] }))
				.toBe("key_collectionID:*;HR.61;*key_owner:*key_public:*");
		});

		it("primary key searches the exclusive space it it's undefined", () => {
			expect(getCacheKeyForResource<Schema>(
				{ owner: "bilbo" }, { keys, primaryKeys: ["collectionID"] }))
				.toBe("no_collectionID;key_owner:*key_public:*");
		});

		it("multiple primary keys use their value", () => {
			expect(getCacheKeyForResource<Schema>(
				{ owner: "bilbo" }, { keys, primaryKeys: ["collectionID", "owner"] }))
				.toBe("no_collectionID;key_owner:*;bilbo;*key_public:*");
		});
	});
});
