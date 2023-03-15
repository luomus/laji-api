import { Test, TestingModule } from "@nestjs/testing";
import { LajiAuthClientService } from "./laji-auth-client.service";

describe("LajiAuthClientService", () => {
	let service: LajiAuthClientService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [LajiAuthClientService],
		}).compile();

		service = module.get<LajiAuthClientService>(LajiAuthClientService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});
});
