import { Controller, Get, Res } from '@nestjs/common';
import { Response } from "express";

@Controller("/")
export class AppController {
	@Get("/")
	redirectToExplorer(@Res() res: Response) {
		res.redirect("/explorer/");
	}
}
