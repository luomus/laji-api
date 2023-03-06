import { Controller, Get, Res } from "@nestjs/common";
import {ApiExcludeController} from "@nestjs/swagger";
import { Response } from "express";

@ApiExcludeController()
@Controller("/")
export class AppController {
	@Get("/")
	redirectToExplorer(@Res() res: Response) {
		res.redirect("/explorer/");
	}
}
