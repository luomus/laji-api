import { HttpException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { DocumentsService, populateCreatorAndEditor } from "./documents.service";
import { WarehouseService } from "src/warehouse/warehouse.service";
import { PopulatedSecondaryDocumentOperation, SecondaryDocument, SecondaryDocumentDelete, SecondaryDocumentOperation,
	isSecondaryDocument, isSecondaryDocumentDelete } from "./documents.dto";
import { Person } from "src/persons/person.dto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SecondaryDocumentsService {

	constructor(
		private warehouseService: WarehouseService,
		@Inject(forwardRef(() => DocumentsService)) private documentsService: DocumentsService,
		private config: ConfigService
	) {}

	async create(createOrDelete: SecondaryDocumentDelete, person: Person, accessToken: string)
		: Promise<SecondaryDocumentDelete>
	async create(createOrDelete: SecondaryDocument, person: Person, accessToken: string)
		: Promise<SecondaryDocument>
	async create(createOrDelete: SecondaryDocumentOperation, person: Person, accessToken: string)
		: Promise<SecondaryDocument | SecondaryDocumentOperation>
	{
		const populatedCreateOrDelete = await this.populateMutably(createOrDelete, person, accessToken);
		await this.validate(populatedCreateOrDelete, person);
		await (isSecondaryDocumentDelete(populatedCreateOrDelete)
			? this.warehouseService.pushDelete(populatedCreateOrDelete.id, populatedCreateOrDelete.collectionID)
			: this.warehouseService.push(populatedCreateOrDelete));
		return populatedCreateOrDelete;
	}

	async populateMutably(createOrDelete: SecondaryDocumentOperation, person: Person | undefined, accessToken: string)
		: Promise<PopulatedSecondaryDocumentOperation>
	{
		const populated = (isSecondaryDocumentDelete(createOrDelete)
			? await this.documentsService.deriveCollectionIDMutably(createOrDelete)
			: await this.documentsService.populateMutably(createOrDelete, person, accessToken));
		if (person && !isSecondaryDocumentDelete(populated)) {
			populateCreatorAndEditor(populated, person);
		}
		if (isSecondaryDocument(populated)) {
			const secondarySystemID = this.config.get<string>("SECONDARY_SYSTEM");
			if (!secondarySystemID) {
				throw new Error("Server configuration is missing secondary system id");
			}
			populated.sourceID = secondarySystemID;
		}
		return populated;
	}

	async validate(createOrDelete: PopulatedSecondaryDocumentOperation, person: Person) {
		if (!createOrDelete.id) {
			throw new HttpException("Secondary document must have id", 422);
		}
		 // TODO no validation whatsoever... Ask from Esko if personToken access is checked on warehouse.
		if (isSecondaryDocument(createOrDelete)) {
			await this.documentsService.validate(createOrDelete, person);
		}
	}

	/** Assumes that data is already populated & validated */
	async pushMultiple(documents: (SecondaryDocument | SecondaryDocumentDelete & { collectionID: string })[]) {
		return this.warehouseService.pushMultiple(documents);
	}
}
