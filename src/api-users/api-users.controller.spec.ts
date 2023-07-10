import { Test, TestingModule } from "@nestjs/testing";
import { ApiUsersController } from "./api-users.controller";

describe("ApiUsersController", () => {
	let controller: ApiUsersController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [ApiUsersController],
		}).compile();

		controller = module.get<ApiUsersController>(ApiUsersController);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});
});
