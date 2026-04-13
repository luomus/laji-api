import { RedisCacheService } from "src/redis-cache/redis-cache.service";

const inflight = new Map<string, Promise<any>>();

/**
 * Memoizes the method in Redis with in-flight deduplication. Use `clearRedisMemoization()` to clear all instance's
 * memoized methods.
 */
export function RedisMemoize(ttlMs?: number) {
	return function (target: any, key: PropertyKey, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		const wrappedMethod = function (...args: any[]) {
			if (!this.cache) {
				// eslint-disable-next-line max-len
				throw new Error("RedisMemoize decorator requires \"this.cache\" which should be an instance of RedisCacheService");
			}

			const argsKey = args.map(arg => JSON.stringify(arg)).join(":");
			const redisKey = `redisMemoize:${target.constructor.name}:${key.toString()}:${argsKey}`;

			if (inflight.has(redisKey)) {
				return inflight.get(redisKey)!;
			}

			const promise = (async () => {
				const cached = await this.cache.get(redisKey);
				if (cached !== null && cached !== undefined) {
					inflight.delete(redisKey);
					return cached;
				}

				try {
					const result = await originalMethod.apply(this, args);
					await this.cache.set(redisKey, result, ttlMs);
					inflight.delete(redisKey);
					return result;
				} catch (e) {
					inflight.delete(redisKey);
					throw e;
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
