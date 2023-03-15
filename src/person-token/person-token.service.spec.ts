import { Test, TestingModule } from "@nestjs/testing";
import { PersonTokenService } from "./person-token.service";

describe("PersonTokenService", () => {
	let service: PersonTokenService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [PersonTokenService],
		}).compile();

		service = module.get<PersonTokenService>(PersonTokenService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});
});
