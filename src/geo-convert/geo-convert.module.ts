import { FactoryProvider, Module } from "@nestjs/common";
import { GeoConvertController } from "./geo-convert.controller";
import { GeoConvertService } from "./geo-convert.service";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { GEOCONVERT_CLIENT } from "src/provider-tokens";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { RestClientService } from "src/rest-client/rest-client.service";
import { JSONObjectSerializable } from "src/typing.utils";


const GeoConvertClient: FactoryProvider<RestClientService<JSONObjectSerializable>> = {
	provide: GEOCONVERT_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService, cache: RedisCacheService) =>
		new RestClientService(httpService, {
			name: "geo-convert",
			host: config.get<string>("GEOCONVERT_HOST")
		}, cache),
	inject: [HttpService, ConfigService, RedisCacheService],
};

@Module({
	controllers: [GeoConvertController],
	providers: [GeoConvertService, GeoConvertClient]
})
export class GeoConvertModule {}
