import { Module } from "@nestjs/common";
import { GeoConvertController } from "./geo-convert.controller";
import { GlobalRestClientModule } from "src/rest-client/global-rest-client.module";
import { TriplestoreModule } from "src/triplestore/triplestore.module";


@Module({
	controllers: [GeoConvertController],
	imports: [GlobalRestClientModule, TriplestoreModule]
})
export class GeoConvertModule {}
