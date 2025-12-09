import { All, Body, Get, Header, HttpCode, Logger, Next, Param, Post, Query, Req, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { GetGeoConvertDto } from "./geo-convert.dto";
import { RequestPersonToken } from "src/decorators/request-person-token.decorator";
import { ConfigService } from "@nestjs/config";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fixRequestBodyAndAuthHeader } from "src/proxy-to-old-api/fix-request-body-and-auth-header";
import { NextFunction, Request, Response } from "express";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { DownloadRequest } from "@luomus/laji-schema/models";
import { firstFromNonEmptyArr, joinOnlyStringsWith, lastFromNonEmptyArr } from "src/utils";

@ApiTags("GeoConvert")
@LajiApiController("geo-convert")
export class GeoConvertController {

	private logger = new Logger(GeoConvertController.name);

	constructor(private config: ConfigService, private triplestoreService: TriplestoreService) {}

	geoConvertProxy = createProxyMiddleware({
		changeOrigin: true,
		target: this.config.get<string>("GEOCONVERT_HOST"),
		pathRewrite: function (path: string, req: Request) {
			// For some reason we offer a different API signature for GET/POST endpoints for data uploads,
			// so this hack detects those queries and translates the signature.
			// eslint-disable-next-line prefer-const
			let { lang, geometryType, crs, ...unknownQueryParams } = req.query;
			if (["output", "status"].every(uriFragment => !req.path.includes(uriFragment))) {
				lang = lang ?? "tech";
			}
			const url = new URL("", "http://dummy"); // Base (the "dummy" part) is required but ignored.
			url.searchParams.set("timeout", "0");
			Object.keys(unknownQueryParams).forEach(k => {
				url.searchParams.set(k, unknownQueryParams[k] as any);
			});
			path = `${joinOnlyStringsWith("/")(req.path, lang, geometryType, crs)}?${url.searchParams}`;
			return path.replace(/^\/geo-convert/, "");
		},
		on: {
			proxyReq: (proxyReq, req) => {
				fixRequestBodyAndAuthHeader(proxyReq, req);
			},
			proxyRes:  (proxyRes) => {
				if (proxyRes.statusCode === 303) {
					proxyRes.statusCode = 200;
				}
			},
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
			path = `${joinOnlyStringsWith("/")(req.path, outputFormat, geometryType, crs)}?${url.searchParams}`
			// console.log(path.replace(/^\/geo-convert/, ""));
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
		const { fileId, conversionId } = req.query;
		const pathParam = lastFromNonEmptyArr(req.path.split("/"));
		const downloadRequestId = pathParam.includes("-") ? firstFromNonEmptyArr(pathParam.split("-")) : pathParam;
		const { createdFileVersion } = await this.triplestoreService.get<DownloadRequest>(downloadRequestId as string);
		if (createdFileVersion) {
			void this.geoConvertProxy(req, res, next);
		} else {
			void this.oldGeoConvertProxy(req, res, next);
		}
	}

	// The method below are just for swagger. The proxy handles all requests really.

	/* eslint-disable */

	/** Convert a FinBIF occurrence data file into a geographic data format */
	@Get(":fileId")
	@HttpCode(200)
	// @Header("Content-Type", "application/json")
	get(
		/** Input file's identifier */
		@Param("fileId") fileId: string,
		@Query() query: GetGeoConvertDto,
		@RequestPersonToken({ required: false, description:	"For use with restricted data downloads" })
			personToken?: string
	) {
	}

	/** Convert a FinBIF occurrence data file into a geographic data format */
	@Post(":fileId")
	@HttpCode(200)
	@Header("Content-Type", "application/json")
	post(
		/** Input file's identifier */
		@Param("fileId") fileId: string,
		@Query() query: GetGeoConvertDto,
		@Body() data: any
	) { }

	/** Get status of a conversion */
	@Get("status/:conversionId")
	@HttpCode(200)
	@Header("Content-Type", "application/json")
	status(
		@Param("conversionId") conversionId: string
	) { }

	/** Get the output file of a conversion */
	@Get("output/:conversionId")
	@HttpCode(200)
	@Header("Content-Type", "application/json")
	output(
		@Param("conversionId") conversionId: string
	) { }
}
