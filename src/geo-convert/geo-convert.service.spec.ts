import { Test, TestingModule } from "@nestjs/testing";
import { GeoConvertService } from "./geo-convert.service";

describe("GeoConvertService", () => {
	let service: GeoConvertService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [GeoConvertService],
		}).compile();

		service = module.get<GeoConvertService>(GeoConvertService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});
});
