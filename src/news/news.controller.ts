import { Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { NewsService } from "./news.service";
import { GetNewsPageDto } from "./news.dto";
import { RequestLang } from "src/decorators/request-lang.decorator";
import { Lang } from "src/common.dto";

@ApiTags("News")
@LajiApiController("news")
export class NewsController {

	constructor(private newsService: NewsService) {}

	/** Get a page of news */
	@Get()
	getPage(@Query() { tag, page, pageSize }: GetNewsPageDto, @RequestLang() lang: Lang) {
		return this.newsService.getPage(page!, pageSize!, lang, tag);
	}

	/** Get news item */
	@Get(":id")
	get(@Param("id") id: string) {
		return this.newsService.get(id);
	}
}
