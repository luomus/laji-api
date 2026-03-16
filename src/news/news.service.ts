import { Inject, Injectable } from "@nestjs/common";
import { NEWS_CLIENT } from "src/provider-tokens";
import { RestClientService } from "src/rest-client/rest-client.service";
import { NewsPagedDto } from "./news.dto";
import { Lang } from "src/common.dto";
import { LajiBackendCMSNode } from "src/information/information.dto";

@Injectable()
export class NewsService {

	constructor(
		@Inject(NEWS_CLIENT) private newsClient: RestClientService,
	) { }

	getPage(page: number, pageSize: number, lang: Lang, tag?: string) {
		return this.newsClient.get<NewsPagedDto>("", { params: { locale: lang, tag, page, pageSize } });
	}

	get(id: string) {
		return this.newsClient.get<LajiBackendCMSNode>(id);
	}

}
