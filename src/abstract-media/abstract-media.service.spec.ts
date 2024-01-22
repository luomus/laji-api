import { Test, TestingModule } from "@nestjs/testing";
import { AbstractMediaService } from "./abstract-media.service";

describe("AbstractMediaService", () => {
	let service: AbstractMediaService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [AbstractMediaService],
		}).compile();

		service = module.get<AbstractMediaService>(AbstractMediaService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});
});
