import { getPath } from "./document-validator.utils";

describe("document-validator.utils", () => {
	describe("getPath()", () => {
		it("returns subpath when path is undefined", () => {
			expect(getPath(undefined, "/subpath")).toBe("/subpath");
		});

		it("returns subpath when path is an empty string", () => {
			expect(getPath("", "/subpath")).toBe("/subpath");
		});

		it("concatenates path and subpath when path is non-empty", () => {
			expect(getPath("/basepath", "/subpath")).toBe("/basepath/subpath");
		});

		it("errors for subpath if it's not a JSON pointre", () => {
			expect(() => getPath("/basepath", "subpath")).toThrowError();
		});

		it("concatenates correctly with trailing slash in path", () => {
			expect(getPath("/basepath/", "/subpath")).toBe("/basepath//subpath");
		});
	});
});
