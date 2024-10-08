import { Logger } from "@nestjs/common";

/**
 * A cache solution which automatically performs the following "job" (optionally periodically):
 *
 * * Flush methods memoized with `@IntelligentMemoize()`
 * * Warm up (calls the `warmup()` method of the decorated class
 *
 * The "job" is called at initialization, so the cache is warmed up right away.
 *
 * The class can have a `warmup()` method that should call methods that warm up the memoized data.
 *
 * Decorate the `warmup()` with an `@Interval()` to make it update periodically.
 */
export const IntelligentInMemoryCache = () => (target: any) => {
	const logger = new Logger(target.prototype.constructor.name);

	// Monkey patch the `warmup()` method to bust memoized methods.
	const originalWarmup = target.prototype.warmup;
	target.prototype.warmup = function() {
		target.prototype._memoizedFns.forEach((f: any) => f.clear());
		return originalWarmup?.call(this);
	};

	// Copy decorators to the monkey patched warmup method.
	Reflect.getOwnMetadataKeys(originalWarmup).forEach(key =>
		Reflect.defineMetadata(key, Reflect.getMetadata(key, originalWarmup), target.prototype.warmup)
	);

	// Make a `onApplicationBootstrap()` method that warms up by calling the `warmup()` method.
	const originalOnApplicationBootstrap = target.prototype.onApplicationBootstrap;
	target.prototype.onApplicationBootstrap = function() {
		logger.log("Warming up");
		target.prototype.warmup.call(this).then(() => {
			logger.log("Warming up in background completed");
		});
		originalOnApplicationBootstrap?.call(this);
	};
};
