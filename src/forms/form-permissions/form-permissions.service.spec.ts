import { Test, TestingModule } from "@nestjs/testing";
import { FormPermissionsService } from "./form-permissions.service";

describe("FormPermissionsService", () => {
	let service: FormPermissionsService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [FormPermissionsService],
		}).compile();

		service = module.get<FormPermissionsService>(FormPermissionsService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});
});
