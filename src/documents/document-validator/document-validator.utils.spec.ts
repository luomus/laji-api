import { joinJSONPaths } from "./document-validator.utils";

describe("document-validator.utils", () => {
	describe("joinJSONPaths()", () => {
		it("returns subpath when path is undefined", () => {
			expect(joinJSONPaths(undefined, "/subpath")).toBe("/subpath");
		});

		it("returns subpath when path is an empty string", () => {
			expect(joinJSONPaths("", "/subpath")).toBe("/subpath");
		});

		it("joins path and subpath when path is non-empty", () => {
			expect(joinJSONPaths("/basepath", "/subpath")).toBe("/basepath/subpath");
		});

		it("errors for subpath if it's not a JSON pointer", () => {
			expect(() => joinJSONPaths("/basepath", "subpath")).toThrowError();
		});

		it("joins correctly with trailing slash in path", () => {
			expect(joinJSONPaths("/basepath/", "/subpath")).toBe("/basepath//subpath");
		});
	});
});
