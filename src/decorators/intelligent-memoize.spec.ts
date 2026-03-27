import "reflect-metadata";
import { clearMemoization, IntelligentInMemoryCache } from "./intelligent-in-memory-cache.decorator";
import { IntelligentMemoize } from "./intelligent-memoize.decorator";

describe("IntelligentInMemoryCache + IntelligentMemoize", () => {

	@IntelligentInMemoryCache()
	class TestService {
		public computeSpy = jest.fn();

		@IntelligentMemoize()
		compute(x: number) {
			return this.computeSpy(x);
		}

		public warmupSpy = jest.fn();

		warmup() {
			this.warmupSpy();
			return this.compute(42);
		}
	}

	let service: TestService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new TestService();
		(service as any)._memoizedFns = {};
	});

	it("memoizes method results", async () => {
		service.compute(1);
		service.compute(1);
		expect(service.computeSpy).toHaveBeenCalledTimes(1);
	});

	it("calls warmup during onApplicationBootstrap", async () => {
		const spy = jest.spyOn(service, "warmup");

		await (service as any).onApplicationBootstrap();

		expect(spy).toHaveBeenCalled();
	});

	it("warmup clears memoized function caches", async () => {
		service.compute(1);
		service.compute(1);
		expect(service.computeSpy).toHaveBeenCalledTimes(1);
		await service.warmup();
		service.compute(1);
		expect(service.computeSpy).toHaveBeenCalledTimes(3);
	});

	it("during warmup, memoized methods are called and stored", async () => {
		await service.warmup();
		expect(service.warmupSpy).toHaveBeenCalledTimes(1);
		service.compute(42);
		expect(service.computeSpy).toHaveBeenCalledTimes(1);
	});

	it("clearMemoization clears all existing memoized caches", () => {
		service.compute(10);
		expect(service.computeSpy).toHaveBeenCalledTimes(1);
		clearMemoization(service);
		service.compute(10);
		expect(service.computeSpy).toHaveBeenCalledTimes(2);
	});
});
