import { Module } from "@nestjs/common";
import { AreaService } from "./area.service";
import { TriplestoreReadonlyModule } from "src/triplestore/triplestore-readonly.module";
import { AreaController } from "./area.controller";

@Module({
	imports: [TriplestoreReadonlyModule],
	providers: [AreaService],
	exports: [AreaService],
	controllers: [AreaController]
})
export class AreaModule {}
