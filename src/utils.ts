type Reducer<T, R>  = {
	(value: T): R | Promise<R>;
}

function isPromise<T>(p: any): p is Promise<T> {
	return !!p?.then;
}

/**
 * RXJS' `pipe` for plain promises.
 * Reduces an initial value into something else with a list of promises.
 *
 * @param initialValue The initial value that is passed to the 1st operation.
 * @param {...operations} operators which return the accumulated result which is passed to the next operation.
 *
 * @returns The accumulated result as a promise.
 */
/* eslint-disable max-len */
function promisePipe<T>(initialValue: T | Promise<T>): Promise<T>;
function promisePipe<T, A>(initialValue: T | Promise<T>, op1: Reducer<T, A>): Promise<A>;
function promisePipe<T, A, B>(initialValue: T | Promise<T>, op1: Reducer<T, A>, op2: Reducer<A, B>): Promise<B>;
function promisePipe<T, A, B, C>(initialValue: T | Promise<T>, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>): Promise<C>;
function promisePipe<T, A, B, C, D>(initialValue: T | Promise<T>, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>): Promise<D>;
function promisePipe<T, A, B, C, D, E>(initialValue: T | Promise<T>, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>): Promise<E>;
function promisePipe<T, A, B, C, D, E, F>(initialValue: T | Promise<T>, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>, op6: Reducer<E, F>): Promise<F>;
function promisePipe<T, A, B, C, D, E, F, G>(initialValue: T | Promise<T>, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>, op6: Reducer<E, F>, op7: Reducer<F, G>): Promise<G>;
function promisePipe<T, A, B, C, D, E, F, G, H>(initialValue: T | Promise<T>, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>, op6: Reducer<E, F>, op7: Reducer<F, G>, op8: Reducer<G, H>): Promise<H>;
function promisePipe<T, A, B, C, D, E, F, G, H, I>(initialValue: T | Promise<T>, op1: Reducer<T, A>, op2: Reducer<A, B>, op3: Reducer<B, C>, op4: Reducer<C, D>, op5: Reducer<D, E>, op6: Reducer<E, F>, op7: Reducer<F, G>, op8: Reducer<G, H>, op9: Reducer<H, I>): Promise<I>;
function promisePipe<T>(initialValue: T | Promise<T>, ...operations: Reducer<any, any>[]): Promise<any> {
	return operations.reduce((promise, fn) => promise.then(
		value => isPromise(fn)
			? fn(value)
			: Promise.resolve(fn(value))
	)
	, isPromise(initialValue) ? initialValue : Promise.resolve(initialValue));
}
export { promisePipe };
