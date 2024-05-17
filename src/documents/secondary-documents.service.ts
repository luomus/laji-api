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

	async create(createOrDelete: SecondaryDocumentOperation, personToken: string, accessToken: string) {
		if (!createOrDelete.id) {
			throw new HttpException("Secondary document must have id", 422);
		}

		const person = await this.personsService.getByToken(personToken);
		const populatedCreateOrDeleteOp = (isSecondaryDocumentDelete(createOrDelete)
			? await this.documentsService.deriveCollectionIDMutably(createOrDelete)
			: await this.documentsService.populateMutably(createOrDelete, person, accessToken));
		await this.documentsService.checkCanAccessForm(populatedCreateOrDeleteOp.formID, personToken);
		return isSecondaryDocumentDelete(populatedCreateOrDeleteOp)
			? this.warehouseService.pushDelete(populatedCreateOrDeleteOp.id, populatedCreateOrDeleteOp.collectionID)
			: this.warehouseService.push(populatedCreateOrDeleteOp);
	}
}
