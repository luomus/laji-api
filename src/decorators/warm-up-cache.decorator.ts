import { Logger } from "@nestjs/common";

/**
 * A cache solution which automatically performs the following "job" periodically:
 * * Bust memoized methods cache
 * * Warm up
 *
 * The "job" is called at initialization, so the cache is warmed up right away.
 *
 * The class must have an `warmup()` method decorated with an
 */
export const WarmupCache = () => (target: any) => {
	if (!target.prototype.warmup) {
		throw new Error("WarmupAndCache doesn't do anything if the target class doesn't have an `warmup()` method!");
	}
	const logger = new Logger(target.prototype.constructor.name);

	// Monkey patch the `warmup()` method to bust memoized methods.
	const originalWarmup = target.prototype.warmup;
	target.prototype.warmup = function() {
		target.prototype._memoizedFns.forEach((f: any) => f.clear());
		return originalWarmup.call(this);
	};

	// Copy decorators to the monkey patched warmup method.
	Reflect.getOwnMetadataKeys(originalWarmup).forEach(key =>
		Reflect.defineMetadata(key, Reflect.getMetadata(key, originalWarmup), target.prototype.warmup)
	);

	// Make a `onModuleInit()` method that warms up by calling the `warmup()` method.
	const originalOnModuleInit = target.prototype.onModuleInit;
	target.prototype.onModuleInit = function() {
		logger.log("Warming up");
		target.prototype.warmup.call(this).then(() => {
			logger.log("Warming up in background completed");
		});
		originalOnModuleInit?.call(this);
	};
};
