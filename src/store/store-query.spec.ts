import { parseQuery, getQueryVocabulary } from "./store-query";


type Schema = { foo: string | boolean | number, bar: boolean, baz: number, barbabar: number };

const { and, or, exists, not } = getQueryVocabulary<Schema>();

describe("parseQuery", () => {
	it("surrounds string with quotes", () => {
		expect(parseQuery<Schema>({ foo: "a" })).toBe("foo: \"a\"");
	});

	it("doesn't surround booleans with quotes", () => {
		expect(parseQuery<Schema>({ foo: true })).toBe("foo: true");
	});

	it("doesn't surround numbers with quotes", () => {
		expect(parseQuery<Schema>({ foo: 2 })).toBe("foo: 2");
	});

	it("doesn't surround numbers with quotes", () => {
		expect(parseQuery<Schema>({ foo: 2 })).toBe("foo: 2");
	});

	it("parses 'exists' correct", () => {
		expect(parseQuery<Schema>({ foo: exists })).toBe("_exists_: \"foo\"");
	});

	it("joins object properties with AND", () => {
		expect(parseQuery<Schema>({ foo: 1, bar: true })).toBe("foo: 1 AND bar: true");
	});

	it("joins 'or()' object with OR", () => {
		expect(parseQuery<Schema>(or({ foo: 1, bar: true }))).toBe("foo: 1 OR bar: true");
	});

	it("joins an array as AND by default", () => {
		expect(parseQuery<Schema>({ foo: 1 }, { bar: true })).toBe("foo: 1 AND bar: true");
	});

	it("joins 'and()' array as AND", () => {
		expect(parseQuery<Schema>(and({ foo: 1 }, { bar: true }))).toBe("foo: 1 AND bar: true");
	});

	it("joins 'or()' array as OR", () => {
		expect(parseQuery<Schema>(or({ foo: 1 }, { bar: true }))).toBe("foo: 1 OR bar: true");
	});

	it("deep OR and AND", () => {
		expect(parseQuery<Schema>(or({ foo: 1, bar: true }, { baz: 2 })))
			.toBe("(foo: 1 AND bar: true) OR baz: 2");
	});

	it("deeper", () => {
		expect(parseQuery<Schema>(and(or({ foo: 1, bar: true }, { barbabar: 3 }), { baz: 2 })))
			.toBe("((foo: 1 AND bar: true) OR barbabar: 3) AND baz: 2");
	});

	it("literal join", () => {
		expect(parseQuery<Schema>({ foo: [1, 2] })).toBe("foo: (1 2)");
	});

	it("deep literal join", () => {
		expect(parseQuery<Schema>(or({ foo: [1, 2] }, { bar: true }))).toBe("foo: (1 2) OR bar: true");
	});

	it("deep ands and ors", () => {
		expect(parseQuery<Schema>(and({ foo: 1, bar: true }, or({ barbabar: 3 }, { baz: 2 }))))
			.toBe("(foo: 1 AND bar: true) AND (barbabar: 3 OR baz: 2)");
	});

	it("'not()' wraps a literal map", () => {
		expect(parseQuery<Schema>(not({ foo: 2 }))).toBe("NOT foo: 2");
	});

	it("'not()' with 'exists'", () => {
		expect(parseQuery<Schema>(not({ foo: exists }))).toBe("NOT _exists_: \"foo\"");
	});

	it("'not()' wraps literal map", () => {
		expect(parseQuery<Schema>(not({ foo: 2, bar: true, baz: exists })))
			.toBe("NOT (foo: 2 AND bar: true AND _exists_: \"baz\")");
	});

	it("'not()' defaults to AND for sub clause", () => {
		expect(parseQuery<Schema>(not({ foo: 2 }, { bar: true }, { baz: exists })))
			.toBe("NOT (foo: 2 AND bar: true AND _exists_: \"baz\")");
	});

	it("'not()' allows OR as sub clause", () => {
		expect(parseQuery<Schema>(not(or({ foo: 2 }, { bar: true }, { baz: exists }))))
			.toBe("NOT (foo: 2 OR bar: true OR _exists_: \"baz\")");
	});

	it("'not()' wrapped with brackets even if singular", () => {
		expect(parseQuery<Schema>((or({ foo: 2 }, { bar: true }, not({ baz: exists })))))
			.toBe("foo: 2 OR bar: true OR (NOT _exists_: \"baz\")");
	});


	it("'and()' filters empty subclause and resolves into just the wrapped literal term", () => {
		expect(parseQuery<Schema>(and({}, { foo: 2 }))).toBe("foo: 2");
	});

	it("protected against injection by '\"' as attack vector", () => {
		expect(() => parseQuery<Schema>(and({ foo: "\" attack" }))).toThrowError();
	});

	it("protected against injection by '(' as attack vector", () => {
		expect(() => parseQuery<Schema>(and({ foo: "( attack" }))).toThrowError();
	});

	it("protected against injection by ')' as attack vector", () => {
		expect(() => parseQuery<Schema>(and({ foo: "( attack" }))).toThrowError();
	});

	it("protected against injection by ' AND ' as attack vector", () => {
		expect(() => parseQuery<Schema>(and({ foo: " AND attack" }))).toThrowError();
	});

	it("protected against injection by ' And ' as attack vector", () => {
		expect(() => parseQuery<Schema>(and({ foo: " And attack" }))).toThrowError();
	});

	it("protected against injection by ' and ' as attack vector", () => {
		expect(() => parseQuery<Schema>(and({ foo: " and attack" }))).toThrowError();
	});

	it("protected against injection by ' OR ' as attack vector", () => {
		expect(() => parseQuery<Schema>(and({ foo: " OR attack" }))).toThrowError();
	});

	it("protected against injection by ' oR ' as attack vector", () => {
		expect(() => parseQuery<Schema>(and({ foo: " oR attack" }))).toThrowError();
	});

	it("protected against injection by ' and ' as attack vector", () => {
		expect(() => parseQuery<Schema>(and({ foo: " or attack" }))).toThrowError();
	});

	it("doesn't think porkkana is a threat", () => {
		expect(() => parseQuery<Schema>(and({ foo: "porkkana" }))).not.toThrowError();
	});
});
