import { Module } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { StoreClientModule } from "src/store/store-client/store-client.module";

@Module({
	providers: [DocumentsService],
	imports: [StoreClientModule],
	exports: [DocumentsService]
})
export class DocumentsModule {}
