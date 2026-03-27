import * as memoize from "memoizee";

/**
 * Memoizes the method, while enabling `@IntelligentInMemoryCache()` to flush it when it likes.
 *
 * Uses the `memoizee` npm library. See it's docs for options.
 *
 * Options default to `{ promise: true }` - which means that async operations resulting in error aren't memoized.
 */
export function IntelligentMemoize(options: memoize.Options<any> = { promise: true }) {
	return function(target: any, key: PropertyKey, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		descriptor.value = function (...args: any[]) {
			// Create a hidden memoized version stored on the instance
			if (!this._memoizedFns) this._memoizedFns = {};
			if (!this._memoizedFns[key]) {
				this._memoizedFns[key] = memoize(originalMethod.bind(this), options);
			}

			return this._memoizedFns[key](...args);
		};
	};
};

