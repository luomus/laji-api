import { FactoryProvider, Module } from "@nestjs/common";
import { CollectionsService } from "./collections.service";
import { CollectionsController } from "./collections.controller";
import { RestClientService } from "src/rest-client/rest-client.service";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { TriplestoreModule } from "src/triplestore/triplestore.module";
import { LangModule } from "src/lang/lang.module";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { GBIF_CLIENT } from "src/provider-tokens";

const GbifClient: FactoryProvider<RestClientService> = {
	provide: GBIF_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService, cache: RedisCacheService) =>
		new RestClientService(httpService, {
			name: "gbif",
			host: config.get<string>("GBIF_HOST"),
		}, cache),
	inject: [HttpService, ConfigService, RedisCacheService],
};

@Module({
	imports: [TriplestoreModule, LangModule],
	controllers: [CollectionsController],
	providers: [CollectionsService, GbifClient],
	exports: [CollectionsService]
})
export class CollectionsModule {}
