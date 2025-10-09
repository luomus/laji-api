import { fixRequestBody } from "http-proxy-middleware";

export function fixRequestBodyAndAuthHeader(proxyReq: any, req: any) {
	fixRequestBody(proxyReq, req);

	const auth = (req as any).headers["authorization"];
	if(auth && auth.toLowerCase().startsWith("bearer ")) {
		// Remove "Bearer "  since old api doesn't like it.
		proxyReq.setHeader("authorization", auth.substring(7));
	}
}

