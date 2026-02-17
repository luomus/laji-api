import { All, Logger, Next, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createProxyMiddleware } from "http-proxy-middleware";
import { NextFunction, Request, Response } from "express";
import { MergesRemoteSwagger, RemoteSwaggerMerge, patchSwaggerWith }
	from "src/decorators/remote-swagger-merge.decorator";
import * as googleMapsGeocodeJsonSwagger from "./google-maps-openapi3.json";
import { OpenAPIObject } from "@nestjs/swagger";

@RemoteSwaggerMerge("google-maps")
export class GoogleController implements MergesRemoteSwagger {

	private logger = new Logger(GoogleController.name);

	constructor(
		private config: ConfigService
	) {}

	googleMapsProxy = createProxyMiddleware({
		target: "https://maps.googleapis.com/maps/api",
		changeOrigin: true,
		pathRewrite: {
			"^/google-maps": "/"
		},
		on: {
			proxyReq: (proxyReq) => {
				const url = new URL(proxyReq.path, "https://maps.googleapis.com");
				url.searchParams.append("key", this.config.get<string>("GOOGLE_API_KEY")!);
				proxyReq.path = url.pathname + url.search;
			}
		},
		logger: {
			info: this.logger.verbose,
			warn: this.logger.warn,
			error: this.logger.error,
		}
	});

	@All("*all")
	proxy(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
		void this.googleMapsProxy(req, res, next);
	}

	fetchSwagger() {
		return googleMapsGeocodeJsonSwagger as OpenAPIObject;
	}

	patchSwagger(document: OpenAPIObject, remoteDoc: OpenAPIObject) {
		return patchSwaggerWith(undefined, "/google-maps", "Google Maps", "GoogleMaps")(document, remoteDoc);
	};
}
