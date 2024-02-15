import { Module } from "@nestjs/common";
import { AreaModule } from "src/area/area.module";
import { LangModule } from "src/lang/lang.module";
import { TaxaModule } from "src/taxa/taxa.module";
import { PrepopulatedDocumentService } from "./prepopulated-document.service";
import { FormsModule } from "src/forms/forms.module";

@Module({
	providers: [PrepopulatedDocumentService],
	imports: [TaxaModule, AreaModule, LangModule, FormsModule],
	exports: [PrepopulatedDocumentService]
})
export class PrepopulatedDocumentModule {}
