import { Inject, Injectable } from "@nestjs/common";
import { Lang } from "src/common.dto";
import { NEWS_CLIENT } from "src/provider-tokens";
import { RestClientService } from "src/rest-client/rest-client.service";
import { NewsPagedDto, NewsDto } from "./news.dto";

@Injectable()
export class NewsService {

	constructor(
		@Inject(NEWS_CLIENT) private newsClient: RestClientService,
	) { }

	getPage(page: number, pageSize: number, lang: Lang, tag?: string) {
		return this.newsClient.get<NewsPagedDto>("", { params: { locale: lang, tag, page, pageSize } });
	}

	get(id: string) {
		return this.newsClient.get<NewsDto>(id);
	}

}
