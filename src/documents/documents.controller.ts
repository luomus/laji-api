import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { AllowedPageQueryKeys, DocumentsService } from "./documents.service";
import { Get, Query } from "@nestjs/common";
import { GetDocumentsDto } from "./documents.dto";
import { PaginatedDto } from "src/pagination";
import { Document } from "./documents.dto";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { whitelistKeys } from "src/utils";

@LajiApiController("documents")
export class DocumentsController {
	constructor(private documentsService: DocumentsService) {}

	/** Get a page of named places */
	@Get()
	@SwaggerRemoteRef({ source: "store", ref: "document" })
	getPage(@Query() query: GetDocumentsDto): Promise<PaginatedDto<Document>> {
		const { personToken, page, pageSize, selectedFields, observationYear, ...q } = query;
		return this.documentsService.getPage(
			whitelistKeys(q, AllowedPageQueryKeys),
			personToken,
			observationYear,
			page,
			pageSize,
			selectedFields
		);
	}
}
