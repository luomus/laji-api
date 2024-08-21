import { dotNotationToJSONPointer, parseJSONPointer, parseURIFragmentIdentifierRepresentation, updateWithJSONPointer }
	from "./utils";

describe("utils", () => {
	const obj = {
		"foo": ["bar", "baz"],
		"": 0,
		" ": 7,
	};

	// Our implementation is partial, excluding functionality that we don't use, to keep complexity small.
	// For example, we don't care about escaping ~1, ~0.
	describe("parseJSONPointer()", () => {

		it("parses empty as whole obj", () => {
			expect(parseJSONPointer(obj, "")).toBe(obj);
		});

		it("parses depth of one", () => {
			expect(parseJSONPointer(obj, "/foo")).toStrictEqual(["bar", "baz"]);
		});

		it("parses depth of two", () => {
			expect(parseJSONPointer(obj, "/foo/0")).toBe("bar");
		});

		it("parses / as empty string property", () => {
			expect(parseJSONPointer(obj, "/")).toBe(0);
		});

		it("parses '/ ' to one empty space char", () => {
			expect(parseJSONPointer(obj, "/ ")).toBe(7);
		});

		it("is validated", () => {
			expect(() => parseJSONPointer(obj, "not/valid/pointer")).toThrowError();
		});

		it("safely option returns undefined for nonexistent property", () => {
			expect(parseJSONPointer(obj, "/not", { safely: true })).toBe(undefined);
		});

		it("safely option returns undefined for nonexistent property deeply", () => {
			expect(parseJSONPointer(obj, "/not/existent", { safely: true })).toBe(undefined);
		});
	});

	describe("updateWithJSONPointer()", () => {

		it("updates value in path", () => {
			const obj2 = { a: "foo" };
			updateWithJSONPointer(obj2, "/a", "bar");
			expect(obj2).toStrictEqual({ a: "bar" });
		});

		it("create option creates missing properties", () => {
			const obj2 = {};
			updateWithJSONPointer(obj2, "/missing/property", "foo", { create: true });
			expect(obj2)
				.toStrictEqual({ missing: { property: "foo" } });
		});

		it("create option creates missing properties deeply", () => {
			const obj2 = {};
			updateWithJSONPointer(obj2, "/missing/property/deep", "foo", { create: true });
			expect(obj2)
				.toStrictEqual({ missing: { property: { deep: "foo" } } });
		});

		it("create option creates array for a numeric token", () => {
			const obj2 = {};
			updateWithJSONPointer(obj2, "/missing/0/a", "foo", { create: true });
			expect(obj2)
				.toStrictEqual({ missing: [ { a: "foo" } ] });
		});

		it("create option creates missing properties obj for non numeric", () => {
			const obj2 = {};
			updateWithJSONPointer(obj2, "/missing/a/b", "foo", { create: true });
			expect(obj2)
				.toStrictEqual({ missing: { a: { b: "foo" } } });
		});
	});

	describe("parseURIFragmentIdentifierRepresentation()", () => {

		it("parses empty as whole obj", () => {
			expect(parseURIFragmentIdentifierRepresentation(obj, "#")).toBe(obj);
		});

		it("parses depth of one", () => {
			expect(parseURIFragmentIdentifierRepresentation(obj, "#/foo")).toStrictEqual(["bar", "baz"]);
		});

		it("parses depth of two", () => {
			expect(parseURIFragmentIdentifierRepresentation(obj, "#/foo/0")).toBe("bar");
		});

		it("parses #/ as empty string property", () => {
			expect(parseURIFragmentIdentifierRepresentation(obj, "#/")).toBe(0);
		});

		it("parses '#/ ' to one empty space char", () => {
			expect(parseURIFragmentIdentifierRepresentation(obj, "#/ ")).toBe(7);
		});

		it("is validated", () => {
			expect(() => parseURIFragmentIdentifierRepresentation(obj, "#not/valid/pointer")).toThrowError();
		});

		it("is validated for hash missing", () => {
			expect(() => parseURIFragmentIdentifierRepresentation(obj, "not/valid/pointer")).toThrowError();
		});

		it("safely option returns undefined for nonexistent property", () => {
			expect(parseURIFragmentIdentifierRepresentation(obj, "#/not", { safely: true })).toBe(undefined);
		});

		it("safely option returns undefined for nonexistent property deeply", () => {
			expect(parseURIFragmentIdentifierRepresentation(obj, "#/not/existent", { safely: true })).toBe(undefined);
		});
	});

	describe("dotNotationToJSONPointer()", () => {
		it("converts empty string to root pointer", () => {
			expect(dotNotationToJSONPointer("")).toBe("");
		});

		it("converts single depth property", () => {
			expect(dotNotationToJSONPointer("foo")).toBe("/foo");
		});

		it("converts nested property", () => {
			expect(dotNotationToJSONPointer("foo.bar")).toBe("/foo/bar");
		});

		it("converts array index notation", () => {
			expect(dotNotationToJSONPointer("foo[0]")).toBe("/foo/0");
		});

		it("converts complex nested structure", () => {
			expect(dotNotationToJSONPointer("foo[0].bar.baz[3]")).toBe("/foo/0/bar/baz/3");
		});

		it("ignores empty segments", () => {
			expect(dotNotationToJSONPointer("foo..bar")).toBe("/foo/bar");
			expect(dotNotationToJSONPointer("foo[0].bar..baz")).toBe("/foo/0/bar/baz");
		});

		it("handles properties with spaces", () => {
			expect(dotNotationToJSONPointer("foo. bar")).toBe("/foo/ bar");
			expect(dotNotationToJSONPointer(" foo.bar")).toBe("/ foo/bar");
		});
	});
});
