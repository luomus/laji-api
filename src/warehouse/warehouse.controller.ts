import { createProxyMiddleware } from "http-proxy-middleware";
import { All, Controller, Next, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NextFunction, Request, Response } from "express";
import { ApiExcludeController } from "@nestjs/swagger";

@Controller("warehouse")
@ApiExcludeController() // Warehouse has it's own swagger doc, which is merged to ours by SwaggerService.
export class WarehouseController {

	constructor(private config: ConfigService) {}

	warehouseProxy = createProxyMiddleware({
		target: this.config.get("WAREHOUSE_PATH") as string,
		changeOrigin: true,
		pathRewrite: {
			"^/warehouse": "/"
		}
	});

  @All("*")
	proxy(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
		this.warehouseProxy(req, res, next);
	}

}
