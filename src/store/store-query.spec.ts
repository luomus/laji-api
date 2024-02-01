import { parseQuery, and, or } from "./store-query";

describe("parseQuery", () => {
	it("surrounds string with quotes", () => {
		expect(parseQuery<any>({ foo: "a" })).toBe("foo: \"a\"");
	});

	it("doesn't surround booleans with quotes", () => {
		expect(parseQuery<any>({ foo: true })).toBe("foo: true");
	});

	it("doesn't surround numbers with quotes", () => {
		expect(parseQuery<any>({ foo: 2 })).toBe("foo: 2");
	});

	it("joins object properties with AND", () => {
		expect(parseQuery<any>({ foo: 1, bar: true })).toBe("foo: 1 AND bar: true");
	});

	it("joins or object with OR", () => {
		expect(parseQuery<any>(or({ foo: 1, bar: true }))).toBe("foo: 1 or bar: true");
	});

	it("joins an array as AND by default", () => {
		expect(parseQuery<any>({ foo: 1 }, { bar: true })).toBe("foo: 1 AND bar: true");
	});

	it("joins and() arr as AND", () => {
		expect(parseQuery<any>(and({ foo: 1 }, { bar: true }))).toBe("foo: 1 AND bar: true");
	});

	it("joins or() arr as OR", () => {
		expect(parseQuery <any>(or({ foo: 1 }, { bar: true }))).toBe("(foo: 1) OR (bar: true)");
	});

	it("deep OR and AND", () => {
		expect(parseQuery<any>(or({ foo: 1, bar: true }, { baz: 2 })))
			.toBe("(foo: 1 AND bar: true) OR (baz: 2)");
	});

	it("deeper", () => {
		expect(parseQuery<any>(and(or({ foo: 1, bar: true }, { barbabar: 3 }), { baz: 2 })))
			.toBe("((foo: 1 AND bar: true) OR (barbabar: 3)) AND (baz: 2)");
	});

	it("literal join", () => {
		expect(parseQuery<any>({ foo: [1, 2] })).toBe("foo: (1 2)");
	});

	it("deep literal join", () => {
		expect(parseQuery<any>(or({ foo: [1, 2] }, { bar: 3 }))).toBe("(foo: (1 2)) OR (bar: 3)");
	});

	it("deep ands and ors", () => {
		expect(parseQuery<any>(and({ foo: 1, bar: true }, or({ barbabar: 3 }, { baz: 2 }))))
			.toBe("(foo: 1 AND bar: true) AND ((barbabar: 3) OR (baz: 2))");
	});
});
