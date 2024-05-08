import { HttpException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { WarehouseService } from "src/warehouse/warehouse.service";
import { SecondaryDocumentOperation, isSecondaryDocumentDelete } from "./documents.dto";
import { PersonsService } from "src/persons/persons.service";

@Injectable()
export class SecondaryDocumentsService {

	constructor(
		private warehouseService: WarehouseService,
		@Inject(forwardRef(() => DocumentsService)) private documentsService: DocumentsService,
		private personsService: PersonsService,
	) {}

	async create(document: SecondaryDocumentOperation, personToken: string, accessToken: string) {
		if (!document.id) {
			throw new HttpException("Secondary document must have id", 422);
		}

		await this.documentsService.checkCanAccessForm(document.formID, personToken);
		const person = await this.personsService.getByToken(personToken);
		const { collectionID } = (isSecondaryDocumentDelete(document)
			? await this.documentsService.deriveCollectionIDMutably(document)
			: await this.documentsService.populateDocumentMutably(document, person, accessToken));
		return isSecondaryDocumentDelete(document)
			? this.warehouseService.pushDelete(document.id, collectionID)
			: this.warehouseService.push(document);
	}
}
