import { Controller, Get, Res } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Response } from "express";
import { BypassAccessTokenAuth } from "./access-token/access-token.guard";

@ApiExcludeController()
@Controller("/")
export class AppController {
	@Get("/")
	@BypassAccessTokenAuth()
	redirectToExplorer(@Res() res: Response) {
		res.redirect("/explorer/");
	}
}
