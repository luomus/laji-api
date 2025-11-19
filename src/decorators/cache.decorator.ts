import { RedisCacheService } from "src/redis-cache/redis-cache.service";

const inflight = new Map<string, Promise<any>>();

/** Memoizes the method in Redis with in-flight deduplication */
export function Cache(ttl?: number) {
	return function (target: any, key: PropertyKey, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			if (!this.cache || !(this.cache instanceof RedisCacheService)) {
				throw new Error('RedisMemoize decorator requires "this.cache" to be a RedisCacheService instance');
			}

			const argsKey = args.map(arg => JSON.stringify(arg)).join(":");
			const redisKey = `redisMemoize:${key.toString()}:${argsKey}`;

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
	};
}
