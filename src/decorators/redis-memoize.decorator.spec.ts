import "reflect-metadata";
import { RedisMemoize, clearRedisMemoization } from "./redis-memoize.decorator";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

describe("RedisMemoize", () => {
	class TestService {
		cache!: RedisCacheService;
		computeSpy = jest.fn();

		constructor(cache: RedisCacheService) {
			this.cache = cache;
		}

		@RedisMemoize(60)
		async compute(x: number) {
			this.computeSpy(x);
			return x;
		}
	}

	let service: TestService;

	beforeEach(() => {
		jest.clearAllMocks();
		const cache: Record<string, unknown> = {};
		const redis = {
			set: (key: string, value: unknown) => {
				cache[key] = value;
			},
			get: (key: string) => {
				return cache[key] ?? null;
			},
			del: (key: string) => {
				delete cache[key];
			},
			patternDel: (key: string) => {
				Object.keys(cache).forEach(k => {
					if (k.match(new RegExp("^" + key.replace(/\*/g, ".*") + "$"))) {
						delete cache[k];
					}
				});
			}
		} as any;
		service = new TestService(redis);
	});

	it("stores result in Redis after first call and returns cached value", async () => {
		await service.compute(1);
		expect(service.computeSpy).toHaveBeenCalledTimes(1);
		await service.compute(1);
		expect(service.computeSpy).toHaveBeenCalledTimes(1);
	});

	it("deduplicates in-flight calls and returns the same promise", async () => {
		const p1 = service.compute(5);
		const p2 = service.compute(5);
		expect(p2).toBe(p1);
		await Promise.all([p1, p2]);
		expect(service.computeSpy).toHaveBeenCalledTimes(1);
	});

	it("after promise resolves, subsequent calls use cached Redis value", async () => {
		await service.compute(7);
		expect(service.computeSpy).toHaveBeenCalledTimes(1);

		await service.compute(7);
		expect(service.computeSpy).toHaveBeenCalledTimes(1);
	});

	it("clearRedisMemoization deletes cached Redis keys", async () => {
		await service.compute(10);
		expect(service.computeSpy).toHaveBeenCalledTimes(1);
		await clearRedisMemoization(service, service.cache);
		await service.compute(10);
		expect(service.computeSpy).toHaveBeenCalledTimes(2);
	});
});
