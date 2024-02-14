import { Module } from "@nestjs/common";
import { AreaService } from "./area.service";
import { TriplestoreReadonlyModule } from "src/triplestore/triplestore-readonly.module";

@Module({
	imports: [TriplestoreReadonlyModule],
	providers: [AreaService],
	exports: [AreaService]
})
export class AreaModule {}
