import * as memoize from "memoizee";

// Taken from https://github.com/zhaosiyang/memoizee-decorator/blob/25b933572a4ccc000aca0507c885e4ae4355ed54/lib/index.ts
export function Memoize(options?: memoize.Options<any>) {
	return function(target: any, key: PropertyKey, descriptor: PropertyDescriptor) {
		const oldFunction = descriptor.value;
		const newFunction = memoize(oldFunction, options);
		descriptor.value = function () {
			// eslint-disable-next-line prefer-rest-params
			return newFunction.apply(this, arguments);
		};
		// descriptor.value.memoization = newFunction;
		if (!target._memoizedFns) {
			target._memoizedFns = [];
		}
		target._memoizedFns.push(newFunction);
	};
};

