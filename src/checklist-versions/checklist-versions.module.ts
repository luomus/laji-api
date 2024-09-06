import { Module } from "@nestjs/common";
import { ChecklistVersionsController } from "./checklist-versions.controller";
import { ChecklistVersionsService } from "./checklist-versions.service";
import { TriplestoreReadonlyModule } from "src/triplestore/triplestore-readonly.module";

@Module({
	controllers: [ChecklistVersionsController],
	providers: [ChecklistVersionsService],
	imports: [TriplestoreReadonlyModule]
})
export class ChecklistVersionsModule {}
