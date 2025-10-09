import { Injectable, Logger } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { TimeStampedRequest, stringifyRequest } from "src/interceptors/logger.interceptor";
import { fixRequestBodyAndAuthHeader } from "./fix-request-body-and-auth-header";

const OLD_API = "http://127.0.0.1:3003/v0";

@Injectable()
export class ProxyToOldApiService {

	private logger = new Logger(ProxyToOldApiService.name);

	private oldApiProxy = createProxyMiddleware({
		target: OLD_API,
		changeOrigin: true,
		on: {
			proxyReq: fixRequestBodyAndAuthHeader
		},
		logger: {
			info: this.logger.verbose.bind(this),
			warn: this.logger.warn.bind(this),
			error: this.logger.error.bind(this)
		}
	});

	async redirectToOldApi(request: Request, response: Response, next: NextFunction) {
		(request as TimeStampedRequest).lajiApiTimeStamp = Date.now();
		this.logger.verbose(stringifyRequest(request as TimeStampedRequest, false));
		void this.oldApiProxy(request, response, next);
	}
}
