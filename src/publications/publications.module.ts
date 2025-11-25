import { Module } from "@nestjs/common";
import { PublicationsController } from "./publications.controller";
import { PublicationsService } from "./publications.service";
import { TriplestoreReadonlyModule } from "src/triplestore/triplestore-readonly.module";

@Module({
	imports: [TriplestoreReadonlyModule],
	controllers: [PublicationsController],
	providers: [PublicationsService]
})
export class PublicationsModule {}
