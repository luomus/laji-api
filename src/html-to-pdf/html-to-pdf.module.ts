import { Injectable, MiddlewareConsumer, Module, NestMiddleware, NestModule } from "@nestjs/common";
import { HtmlToPdfService } from "./html-to-pdf.service";
import { HtmlToPdfController } from "./html-to-pdf.controller";
import { text } from "body-parser";

@Injectable()
export class HtmlTextMiddleware implements NestMiddleware {
  private readonly parser = text({ type: "*/*", limit: "10mb" });

  use(req: any, res: any, next: (err?: any) => void) {
  	this.parser(req, res, next);
  }
}


@Module({
	providers: [HtmlToPdfService],
	controllers: [HtmlToPdfController]
})
export class HtmlToPdfModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(HtmlTextMiddleware)
			.forRoutes(HtmlToPdfController); // or { path: 'html-to-pdf', method: RequestMethod.POST }
	}}
