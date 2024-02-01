import { Test, TestingModule } from "@nestjs/testing";
import { NamedPlacesController } from "./named-places.controller";

describe("NamedPlacesController", () => {
	let controller: NamedPlacesController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [NamedPlacesController],
		}).compile();

		controller = module.get<NamedPlacesController>(NamedPlacesController);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});
});
