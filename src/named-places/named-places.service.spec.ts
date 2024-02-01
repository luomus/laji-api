import { Test, TestingModule } from "@nestjs/testing";
import { NamedPlacesService } from "./named-places.service";

describe("NamedPlacesService", () => {
	let service: NamedPlacesService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [NamedPlacesService],
		}).compile();

		service = module.get<NamedPlacesService>(NamedPlacesService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});
});
