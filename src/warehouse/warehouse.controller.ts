import { createProxyMiddleware } from "http-proxy-middleware";
import { All, Controller, Logger, Next, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NextFunction, Request, Response } from "express";
import { ApiExcludeController } from "@nestjs/swagger";

@Controller("warehouse")
@ApiExcludeController() // Warehouse has it's own swagger doc, which is merged to ours by SwaggerService.
export class WarehouseController {

	private logger = new Logger(WarehouseController.name);

	constructor(private config: ConfigService) {}

	warehouseProxy = createProxyMiddleware({
		target: this.config.get("WAREHOUSE_HOST") as string,
		changeOrigin: true,
		pathRewrite: {
			"^/warehouse": "/"
		},
		logProvider: () => ({
			log: this.logger.log,
			debug: this.logger.debug,
			info: this.logger.verbose,
			warn: this.logger.warn,
			error: this.logger.error
		})
	});

  @All("*")
	proxy(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
		this.warehouseProxy(req, res, next);
	}

}
