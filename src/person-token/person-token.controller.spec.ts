import { Test, TestingModule } from "@nestjs/testing";
import { PersonTokenController } from "./person-token.controller";

describe("PersonTokenController", () => {
	let controller: PersonTokenController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [PersonTokenController],
		}).compile();

		controller = module.get<PersonTokenController>(PersonTokenController);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});
});
