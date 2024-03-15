import { FactoryProvider, Module } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { TraitController } from "./trait.controller";
import { TRAIT_CLIENT } from "src/provider-tokens";

const TraitClient: FactoryProvider<RestClientService<never>> = {
	provide: TRAIT_CLIENT,
	useFactory: (httpService: HttpService, config: ConfigService) =>
		new RestClientService(httpService, {
			name: "trait",
			host: config.get<string>("LAJI_BACKEND_HOST") + "/trait"
		}),
	inject: [
		HttpService,
		ConfigService
	],
};

@Module({
	controllers: [TraitController],
	providers: [TraitClient],
	exports: [TraitClient],
})
export class TraitModule {}
