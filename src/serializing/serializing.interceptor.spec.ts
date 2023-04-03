import { SerializingInterceptor } from "./serializing.interceptor";

describe("SerializingInterceptor", () => {
	it("should be defined", () => {
		expect(new SerializingInterceptor()).toBeDefined();
	});
});
