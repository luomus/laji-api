import { Injectable, Logger } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";

const OLD_API = "http://127.0.0.1:3003/v0";
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
			info: this.logger.verbose.bind(this),
			warn: this.logger.warn.bind(this),
			error: this.logger.error.bind(this)
		}
	});

	async redirectToOldApi(request: Request, response: Response, next: NextFunction) {
		void this.oldApiProxy(request, response, next);
	}
}
