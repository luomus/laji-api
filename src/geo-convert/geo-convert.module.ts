import { Module } from "@nestjs/common";
import { GeoConvertController } from "./geo-convert.controller";
import { GlobalRestClientModule } from "src/rest-client/global-rest-client.module";


@Module({
	controllers: [GeoConvertController],
	imports: [GlobalRestClientModule]
})
export class GeoConvertModule {}
