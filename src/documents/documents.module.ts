import { Module } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { StoreModule } from "src/store/store.module";

@Module({
	providers: [DocumentsService],
	imports: [StoreModule],
	exports: [DocumentsService]
})
export class DocumentsModule {}
