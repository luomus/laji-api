import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fixRequestBodyAndAuthHeader } from "./fix-request-body-and-auth-header";
import { TimeStampedRequest, stringifyRequest } from "src/interceptors/logger.interceptor";

const OLD_API = "http://127.0.0.1:3003/v0";

@Injectable()
export class ProxyToOldApiMiddleware implements NestMiddleware {
  private logger = new Logger(ProxyToOldApiMiddleware.name);

  private oldApiProxy = createProxyMiddleware({
  	target: OLD_API,
  	changeOrigin: true,
  	on: {
  		proxyReq: fixRequestBodyAndAuthHeader,
  	},
  	logger: {
  		info: this.logger.verbose.bind(this.logger),
  		warn: this.logger.warn.bind(this.logger),
  		error: this.logger.error.bind(this.logger),
  	},
  });

  constructor() {
  	this.use = this.use.bind(this);
  }

  use(req: Request, res: Response, next: NextFunction) {
  	const originalSend = res.send.bind(res);

  	res.send = (body?: any): Response => {
  		if (res.statusCode === 404) {

  			if (req.headers["api-version"] === "1") {
  				return originalSend(body);
  			}

  			(req as TimeStampedRequest).lajiApiTimeStamp = Date.now();
  			this.logger.verbose(stringifyRequest(req as TimeStampedRequest, false));

  			void this.oldApiProxy(req, res, next);

  			return res;
  		}

  		return originalSend(body);
  	};

  	next();
  }
}
