import { Module } from "@nestjs/common";
import { CoordinatesController } from "./coordinates.controller";
import { CoordinatesService } from "./coordinates.service";
import { ElasticModule } from "src/elastic/elastic.module";

@Module({
	imports: [ElasticModule],
	controllers: [CoordinatesController],
	providers: [CoordinatesService]
})
export class CoordinatesModule {}
