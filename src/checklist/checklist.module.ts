import { Module } from "@nestjs/common";
import { ChecklistController } from "./checklist.controller";
import { ChecklistService } from "./checklist.service";
import { TriplestoreReadonlyModule } from "src/triplestore/triplestore-readonly.module";

@Module({
	controllers: [ChecklistController],
	providers: [ChecklistService],
	imports: [TriplestoreReadonlyModule]
})
export class ChecklistModule {}
