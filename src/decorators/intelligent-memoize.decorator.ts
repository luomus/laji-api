import * as memoize from "memoizee";

/**
 *
 * Memoizes the method, while enabling `@IntelligentInMemoryCache()` to flush it when it likes.
 *
 * Uses the `memoizee` npm library. See it's docs for options.
 *
 * Options default to `{ promise: true }` - which means that async operations resulting in error aren't memoized.
 */
export function IntelligentMemoize(options: memoize.Options<any> = { promise: true }) {
	return function(target: any, key: PropertyKey, descriptor: PropertyDescriptor) {
		const oldFunction = descriptor.value;
		const newFunction = memoize(oldFunction, options);
		descriptor.value = function () {
			// eslint-disable-next-line prefer-rest-params
			return newFunction.apply(this, arguments);
		};
		if (!target._memoizedFns) {
			target._memoizedFns = [];
		}
		target._memoizedFns.push(newFunction);
	};
};

