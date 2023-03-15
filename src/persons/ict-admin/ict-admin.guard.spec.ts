import { IctAdminGuard } from "./ict-admin.guard";

describe("IctAdminGuard", () => {
	it("should be defined", () => {
		expect(new IctAdminGuard()).toBeDefined();
	});
});
