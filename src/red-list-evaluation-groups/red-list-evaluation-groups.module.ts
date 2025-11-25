import { Module } from "@nestjs/common";
import { RedListEvaluationGroupsController } from "./red-list-evaluation-groups.controller";
import { RedListEvaluationGroupsService } from "./red-list-evaluation-groups.service";
import { TriplestoreReadonlyModule } from "src/triplestore/triplestore-readonly.module";

@Module({
	imports: [TriplestoreReadonlyModule],
	controllers: [RedListEvaluationGroupsController],
	providers: [RedListEvaluationGroupsService]
})
export class RedListEvaluationGroupsModule {}
