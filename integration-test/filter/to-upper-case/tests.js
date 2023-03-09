const ToUpperCase = require("../../../server/filter/type/to-upper-case").ToUpperCase;
const assert = require("assert");

describe("filter.ToUpperCase", function() {
	const toUpperCase = new ToUpperCase();

	it("can convert locale string to uppercase", function() {
		assert.equal(toUpperCase.filter("ääkkösiä"), "ÄÄKKÖSIÄ");
		assert.equal(toUpperCase.filter("fooBar"), "FOOBAR");
		assert.equal(toUpperCase.filter("αβγ"), "ΑΒΓ");
		assert.equal(toUpperCase.filter("абд"), "АБД");
	});

	it("can handle invalid values", function() {
		assert.equal(toUpperCase.filter(null), null);
		assert.equal(toUpperCase.filter(""), "");
		assert.deepEqual(toUpperCase.filter({}), {});
		assert.deepEqual(toUpperCase.filter(["test"]), ["test"]);
	});
}); // /ToUpperCase
