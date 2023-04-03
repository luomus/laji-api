import { HttpClientErrorToHttpExceptionInterceptor } from "./http-client-error-to-http-exception.interceptor";

describe("HttpClientErrorToHttpExceptionInterceptor", () => {
	it("should be defined", () => {
		expect(new HttpClientErrorToHttpExceptionInterceptor()).toBeDefined();
	});
});
