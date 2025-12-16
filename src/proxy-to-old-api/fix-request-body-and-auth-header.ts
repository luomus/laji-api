import { fixRequestBody } from "http-proxy-middleware";

export function fixRequestBodyAndAuthHeader(proxyReq: any, req: any) {
	const auth = req.headers["authorization"];
	const url = new URL(proxyReq.path, "http://dummy"); // Base is required but ignored.
	if(auth) {
		const withoutBearer = auth.toLowerCase().startsWith("bearer ") ? auth.substring(7) : auth;
		url.searchParams.set("access_token", withoutBearer);
	}

	// Move person-token header to query param.
	const personToken = req.headers["person-token"];
	if (personToken) {
		url.searchParams.set("personToken", personToken);
		proxyReq.path = url.pathname + url.search;
	}
	fixRequestBody(proxyReq, req);
}
