import { Test, TestingModule } from "@nestjs/testing";
import { TriplestoreClientService } from "./triplestore-client.service";

describe("TriplestoreClientService", () => {
	let service: TriplestoreClientService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [TriplestoreClientService],
		}).compile();

		service = module.get<TriplestoreClientService>(TriplestoreClientService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});
});
