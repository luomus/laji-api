import { HtmlToPdfService } from "./html-to-pdf.service";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Body, Header, HttpCode, Post, Res } from "@nestjs/common";
import { Response } from "express";

@ApiTags("HTMLToPDF")
@LajiApiController("html-to-pdf")
export class HtmlToPdfController {
	constructor(private htmlToPdfService: HtmlToPdfService) {}

	/** Convert HTML to PDF */
	@Post()
	@Header("Content-Type", "application/pdf")
	@ApiConsumes("text/plain")
	@HttpCode(200)
	async htmlToPdf(
		/** HTML string */
		@Body() html: string,
		@Res() res: Response
	) {
		const pdf = await this.htmlToPdfService.htmlToPdf(html);
		res.send(pdf);
	}
}
