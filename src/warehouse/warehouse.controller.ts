import { createProxyMiddleware } from "http-proxy-middleware";
import { All, Inject, Logger, Next, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NextFunction, Request, Response } from "express";
import { OpenAPIObject } from "@nestjs/swagger";
import {
	MergesRemoteSwagger, RemoteSwaggerMerge, patchSwaggerWith
} from "src/decorators/remote-swagger-merge.decorator";
import { RestClientService } from "src/rest-client/rest-client.service";
import { JSONSerializable } from "src/typing.utils";
import { WAREHOUSE_CLIENT } from "src/provider-tokens";

@RemoteSwaggerMerge("warehouse")
export class WarehouseController implements MergesRemoteSwagger {

	private logger = new Logger(WarehouseController.name);

	constructor(
		private config: ConfigService,
		@Inject(WAREHOUSE_CLIENT) private warehouseClient: RestClientService<JSONSerializable>
	) {}

	warehouseProxy = createProxyMiddleware({
		target: this.config.get<string>("WAREHOUSE_HOST"),
		changeOrigin: true,
		pathRewrite: {
			"^/warehouse": "/"
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
		return this.warehouseClient.get<OpenAPIObject>("openapi-v3.json");
	}

	patchSwagger(document: OpenAPIObject, remoteDoc: OpenAPIObject) {
		return patchSwaggerWith(undefined, "/warehouse")(document, remoteDoc);
	};
}
