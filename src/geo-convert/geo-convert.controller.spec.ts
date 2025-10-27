import { Test, TestingModule } from "@nestjs/testing";
import { GeoConvertController } from "./geo-convert.controller";

describe("GeoConvertController", () => {
	let controller: GeoConvertController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [GeoConvertController],
		}).compile();

		controller = module.get<GeoConvertController>(GeoConvertController);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});
});
