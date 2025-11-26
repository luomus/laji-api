import { FactoryProvider, Module } from "@nestjs/common";
import { NewsController } from "./news.controller";
import { NewsService } from "./news.service";
import { NEWS_CLIENT } from "src/provider-tokens";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { RestClientService } from "src/rest-client/rest-client.service";

const NewsClient: FactoryProvider<RestClientService<never>> = {
	provide: NEWS_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService) =>
		new RestClientService(httpService, {
			name: "news",
			host: config.get<string>("LAJI_BACKEND_HOST") + "/news"
		}),
	inject: [
		HttpService,
		ConfigService
	],
};


@Module({
	controllers: [NewsController],
	providers: [NewsService, NewsClient]
})
export class NewsModule {
}
