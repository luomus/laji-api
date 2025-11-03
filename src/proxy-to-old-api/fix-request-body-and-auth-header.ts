import { fixRequestBody } from "http-proxy-middleware";

export function fixRequestBodyAndAuthHeader(proxyReq: any, req: any) {
	const auth = req.headers["authorization"];
	if(auth && auth.toLowerCase().startsWith("bearer ")) {
		// Remove "Bearer "  since old api doesn't like it.
		proxyReq.setHeader("authorization", auth.substring(7));
	}

	// Move person-token header to query param.
	const personToken = req.headers["person-token"];
	if (personToken) {
		const url = new URL(proxyReq.path, "http://dummy"); // Base is required but ignored.
		url.searchParams.set("personToken", personToken);
		proxyReq.path = url.pathname + url.search;
	}
	fixRequestBody(proxyReq, req);
}
