import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { AllowedPageQueryKeys, DocumentsService } from "./documents.service";
import { Get, Param, Query } from "@nestjs/common";
import { GetDocumentsDto } from "./documents.dto";
import { PaginatedDto } from "src/pagination";
import { Document } from "./documents.dto";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { whitelistKeys } from "src/utils";
import { QueryWithPersonTokenDto } from "src/common.dto";

@LajiApiController("documents")
export class DocumentsController {
	constructor(private documentsService: DocumentsService) {}

	/** Get a page of named places */
	@Get()
	@SwaggerRemoteRef({ source: "store", ref: "document" })
	getPage(@Query() query: GetDocumentsDto): Promise<PaginatedDto<Document>> {
		const { personToken, page, pageSize, selectedFields, observationYear, ...q } = query;
		console.log(observationYear, typeof observationYear);
		return this.documentsService.getPage(
			whitelistKeys(q, AllowedPageQueryKeys),
			personToken,
			observationYear,
			page,
			pageSize,
			selectedFields
		);
	}

	/** Get a page of named places */
	@Get(":id")
	@SwaggerRemoteRef({ source: "store", ref: "document" })
	get(@Param("id") id: string, @Query() { personToken }: QueryWithPersonTokenDto): Promise<Document> {
		return this.documentsService.get(id, personToken);
	}
}
