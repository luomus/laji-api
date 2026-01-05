import { All, Inject, Logger, Next, Req, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, OpenAPIObject } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fixRequestBodyAndAuthHeader } from "src/proxy-to-old-api/fix-request-body-and-auth-header";
import { NextFunction, Request, Response } from "express";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { DownloadRequest } from "@luomus/laji-schema/models";
import { CACHE_30_MIN, firstFromNonEmptyArr, joinOnlyStringsWith, lastFromNonEmptyArr } from "src/utils";
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
		private triplestoreService: TriplestoreService,
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

	oldGeoConvertProxy = createProxyMiddleware({
		changeOrigin: true,
		target: this.config.get<string>("GEOCONVERT_HOST_OLD"),
		pathRewrite: function (path: string, req: Request) {
			// For some reason we offer a different API signature for GET/POST endpoints for data uploads,
			// so this hack detects those queries and translates the signature.
			// eslint-disable-next-line prefer-const
			let { outputFormat, geometryType, crs, ...unknownQueryParams } = req.query;
			if (["output", "status"].every(uriFragment => !req.path.includes(uriFragment))) {
				outputFormat = outputFormat ?? "gpkg";
			}
			const url = new URL("", "http://dummy"); // Base (the "dummy" part) is required but ignored.
			url.searchParams.set("timeout", "0");
			Object.keys(unknownQueryParams).forEach(k => {
				url.searchParams.set(k, unknownQueryParams[k] as any);
			});
			path = `${joinOnlyStringsWith("/")(req.path, outputFormat, geometryType, crs)}?${url.searchParams}`;
			return path.replace(/^\/geo-convert/, "");
		},
		on: {
			proxyReq: (proxyReq, req) => {
				fixRequestBodyAndAuthHeader(proxyReq, req);
			},
			proxyRes:  (proxyRes) => {
				if (proxyRes.statusCode === 303) {
					proxyRes.statusCode = 200;
					delete proxyRes.headers["location"];
				}
			},
		},
		logger: {
			info: this.logger.verbose,
			warn: this.logger.warn,
			error: this.logger.error
		}
	});

	@All("*all")
	@ApiExcludeEndpoint()
	async proxy(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
		const pathParam = lastFromNonEmptyArr(req.path.split("/"));
		const downloadRequestId = firstFromNonEmptyArr(pathParam.match(/HBF\.\d+/) as string[]);
		const { createdFileVersion } = await this.triplestoreService.get<DownloadRequest>(downloadRequestId as string);
		if (createdFileVersion) {
			void this.geoConvertProxy(req, res, next);
		} else {
			void this.oldGeoConvertProxy(req, res, next);
		}
	}

	fetchSwagger() {
		return this.globalClient.get<OpenAPIObject>(
			`${this.config.get<string>("GEOCONVERT_HOST")}/openapi.json`,
			undefined,
			{ cache: CACHE_30_MIN }
		);
	}

	patchSwagger(document: OpenAPIObject, remoteDoc: OpenAPIObject) {
		return patchSwaggerWith(undefined, "geo-convert", "GeoConvert")(document, remoteDoc);
	};
}
