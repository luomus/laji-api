import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import { All, Logger, Next, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NextFunction, Request, Response } from "express";
import {
	RemoteSwaggerMerge, MergesRemoteSwagger, patchSwaggerWith
} from "src/decorators/remote-swagger-merge.decorator";
import { HttpService } from "@nestjs/axios";
import { RestClientService } from "src/rest-client/rest-client.service";
import { OpenAPIObject } from "@nestjs/swagger";

@RemoteSwaggerMerge("trait")
export class TraitController implements MergesRemoteSwagger {

	private logger = new Logger(TraitController.name);

	constructor(
		private config: ConfigService,
		private httpService: HttpService
	) {
		this.patchSwagger = this.patchSwagger.bind(this);
	}

	private traitClient = new RestClientService(this.httpService, {
		name: "trait",
		host: this.config.get<string>("LAJI_BACKEND_HOST")
	});

	warehouseProxy = createProxyMiddleware({
		target: this.config.get<string>("LAJI_BACKEND_HOST") + "/trait",
		changeOrigin: true,
		pathRewrite: {
			"^/trait": "/"
		},
		on: {
			proxyReq: fixRequestBody
		},
		logger: {
			info: this.logger.verbose,
			warn: this.logger.warn,
			error: this.logger.error
		}
	});

	@All("*")
	proxy(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
		void this.warehouseProxy(req, res, next);
	}

	fetchSwagger() {
		return this.traitClient.get<OpenAPIObject>("openapi-v3.json");
	}

	patchSwagger(document: OpenAPIObject, remoteDoc: OpenAPIObject) {
		return patchSwaggerWith("/trait", "", !!"fix pagination")(document, remoteDoc);
	};
}
