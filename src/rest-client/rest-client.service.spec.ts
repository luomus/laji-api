import { Test, TestingModule } from "@nestjs/testing";
import { RestClientServiceService } from "./rest-client-service.service";

describe("RestClientServiceService", () => {
	let service: RestClientServiceService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [RestClientServiceService],
		}).compile();

		service = module.get<RestClientServiceService>(RestClientServiceService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});
});
