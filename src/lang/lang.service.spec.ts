import { getFirstTermOfJSONPath } from "./lang.service";

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
