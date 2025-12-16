import { RedisCacheService } from "src/redis-cache/redis-cache.service";

const inflight = new Map<string, Promise<any>>();

/**
 * Memoizes the method in Redis with in-flight deduplication. Use `clearRedisMemoization()` to clear all instance's
 * memoized methods.
 */
export function RedisMemoize(ttl?: number) {
	return function (target: any, key: PropertyKey, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		const wrappedMethod = async function (...args: any[]) {
			if (!this.cache || !(this.cache instanceof RedisCacheService)) {
				throw new Error("RedisMemoize decorator requires \"this.cache\" to be a RedisCacheService instance");
			}

			const argsKey = args.map(arg => JSON.stringify(arg)).join(":");
			const redisKey = `redisMemoize:${target.constructor.name}:${key.toString()}:${argsKey}`;

			const cached = await this.cache.get(redisKey);
			if (cached !== null && cached !== undefined) {
				return cached;
			}

			if (inflight.has(redisKey)) {
				return inflight.get(redisKey)!;
			}

			const promise = (async () => {
				try {
					const result = await originalMethod.apply(this, args);
					await this.cache.set(redisKey, result, ttl);
					return result;
				} finally {
					inflight.delete(redisKey);
				}
			})();

			inflight.set(redisKey, promise);

			return promise;
		};

		// Keep the original length property so @IntelligentMemoize can automatically detect length.
		Object.defineProperty(wrappedMethod, "length", {
			value: originalMethod.length,
			writable: false,
		});

		descriptor.value = wrappedMethod;
	};
}

export const clearRedisMemoization = async (instance: object, redis: RedisCacheService) =>  {
	await redis.patternDel(`redisMemoize:${instance.constructor.name}:*`);
};
