import { joinJSONPointers } from "./document-validator.utils";

describe("document-validator.utils", () => {
	describe("joinJSONPointers()", () => {
		it("returns subpath when path is undefined", () => {
			expect(joinJSONPointers(undefined, "/subpath")).toBe("/subpath");
		});

		it("returns subpath when path is an empty string", () => {
			expect(joinJSONPointers("", "/subpath")).toBe("/subpath");
		});

		it("joins path and subpath when path is non-empty", () => {
			expect(joinJSONPointers("/basepath", "/subpath")).toBe("/basepath/subpath");
		});

		it("errors for subpath if it's not a JSON pointer", () => {
			expect(() => joinJSONPointers("/basepath", "subpath")).toThrowError();
		});

		it("joins correctly with trailing slash in path", () => {
			expect(joinJSONPointers("/basepath/", "/subpath")).toBe("/basepath//subpath");
		});
	});
});
