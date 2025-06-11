import { createProxyMiddleware } from "http-proxy-middleware";
import { Controller, HttpException, Logger, Next, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NextFunction, Request, Response } from "express";
import { ApiUser } from "src/decorators/api-user.decorator";
import { ApiUserEntity } from "src/api-users/api-user.entity";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";

@Controller("sound-identification")
export class SoundIdentificationController {
	private logger = new Logger(SoundIdentificationController.name);
	constructor(
		private config: ConfigService,
	) {}

	frontendApiUsers = ["KE.389", "KE.841", "KE.542", "KE.601"];
	soundIdentificationProxy = createProxyMiddleware({
		target: this.config.get<string>("SOUND_IDENTIFICATION_HOST"),
		changeOrigin: true,
		pathRewrite: {
			"^/sound-identification": "/classify"
		},
		logger: {
			info: this.logger.verbose,
			warn: this.logger.warn,
			error: this.logger.error
		}
	});

	@Post("/")
	proxy(
		@ApiUser() apiUser: ApiUserEntity,
		@PersonToken() __: Person,
		@Req() req: Request,
		@Res() res: Response,
		@Next() next: NextFunction
	) {
		if (!(apiUser.systemID && this.frontendApiUsers.includes(apiUser.systemID))) {
			throw new HttpException("System is not allowed access to this endpoint", 403);
		}

		void this.soundIdentificationProxy(req, res, next);
	}
}
