import { Injectable, Logger } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";

const OLD_API = "http://localhost:3003/v0";
// const OLD_API = "https://api.laji.fi/v0";

@Injectable()
export class ProxyToOldApiService {

	private logger = new Logger(ProxyToOldApiService.name);

	private oldApiProxy = createProxyMiddleware({
		target: OLD_API,
		changeOrigin: true,
		on: {
			proxyReq: fixRequestBody
		},
		logger: {
			info: this.logger.verbose,
			warn: this.logger.warn,
			error: this.logger.error
		}
	});

	async redirectToOldApi(request: Request, response: Response, next: NextFunction) {
		void this.oldApiProxy(request, response, next);
	}
}
