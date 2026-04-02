import { All, Inject, Logger, Next, Req, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, OpenAPIObject } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fixRequestBodyAndAuthHeader } from "src/proxy-to-old-api/fix-request-body-and-auth-header";
import { NextFunction, Request, Response } from "express";
import { MS_30_MIN } from "src/utils";
import { MergesRemoteSwagger, RemoteSwaggerMerge, patchSwaggerWith }
	from "src/decorators/remote-swagger-merge.decorator";
import { RestClientService } from "src/rest-client/rest-client.service";
import { GLOBAL_CLIENT } from "src/provider-tokens";
import { JSONSerializable } from "src/typing.utils";

@RemoteSwaggerMerge("geo-convert")
export class GeoConvertController implements MergesRemoteSwagger {

	private logger = new Logger(GeoConvertController.name);

	constructor(
		private config: ConfigService,
		@Inject(GLOBAL_CLIENT) private globalClient: RestClientService<JSONSerializable>
	) {}

	geoConvertProxy = createProxyMiddleware({
		changeOrigin: true,
		target: this.config.get<string>("GEOCONVERT_HOST"),
		pathRewrite: {
			"^/geo-convert": "/"
		},
		on: {
			proxyReq: (proxyReq, req) => {
				fixRequestBodyAndAuthHeader(proxyReq, req);
			}
		},
		logger: {
			info: this.logger.verbose,
			warn: this.logger.warn,
			error: this.logger.error
		}
	});

	@All("*")
	@ApiExcludeEndpoint()
	async proxy(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
		void this.geoConvertProxy(req, res, next);
	}

	@All()
	@ApiExcludeEndpoint()
	async proxyRoot(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
		void this.geoConvertProxy(req, res, next);
	}

	fetchSwagger() {
		return this.globalClient.get<OpenAPIObject>(
			`${this.config.get<string>("GEOCONVERT_HOST")}/openapi.json`,
			undefined,
			{ cache: MS_30_MIN }
		);
	}

	patchSwagger(document: OpenAPIObject, remoteDoc: OpenAPIObject) {
		return patchSwaggerWith(undefined, "/geo-convert", "GeoConvert", "GeoConvert")(document, remoteDoc);
	};
}
