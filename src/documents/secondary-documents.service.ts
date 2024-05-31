import { HttpException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { WarehouseService } from "src/warehouse/warehouse.service";
import { PopulatedSecondaryDocumentOperation, SecondaryDocument, SecondaryDocumentDelete, SecondaryDocumentOperation,
	isSecondaryDocument, isSecondaryDocumentDelete } from "./documents.dto";
import { PersonsService } from "src/persons/persons.service";
import { Person } from "src/persons/person.dto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SecondaryDocumentsService {

	constructor(
		private warehouseService: WarehouseService,
		@Inject(forwardRef(() => DocumentsService)) private documentsService: DocumentsService,
		private personsService: PersonsService,
		private config: ConfigService
	) {}

	async create(createOrDelete: SecondaryDocumentDelete, personToken: string, accessToken: string)
		: Promise<SecondaryDocumentDelete>
	async create(createOrDelete: SecondaryDocument, personToken: string, accessToken: string)
		: Promise<SecondaryDocument>
	async create(createOrDelete: SecondaryDocumentOperation, personToken: string, accessToken: string)
		: Promise<SecondaryDocument | SecondaryDocumentOperation>
	{
		const person = await this.personsService.getByToken(personToken);
		const populatedCreateOrDelete = await this.populateMutably(createOrDelete, person, accessToken);
		await this.validate(populatedCreateOrDelete, personToken);
		await (isSecondaryDocumentDelete(populatedCreateOrDelete)
			? this.warehouseService.pushDelete(populatedCreateOrDelete.id, populatedCreateOrDelete.collectionID)
			: this.warehouseService.push(populatedCreateOrDelete));
		return populatedCreateOrDelete;
	}

	async populateMutably(createOrDelete: SecondaryDocumentOperation, person: Person, accessToken: string)
		: Promise<PopulatedSecondaryDocumentOperation>
	{
		const populated = (isSecondaryDocumentDelete(createOrDelete)
			? await this.documentsService.deriveCollectionIDMutably(createOrDelete)
			: await this.documentsService.populateMutably(createOrDelete, person, accessToken));
		if (isSecondaryDocument(populated)) {
			const secondarySystemID = this.config.get<string>("SECONDARY_SYSTEM");
			if (!secondarySystemID) {
				throw new Error("Server configuration is missing secondary system id");
			}
			populated.sourceID = secondarySystemID;
		}
		return populated;
	}

	async validate(createOrDelete: PopulatedSecondaryDocumentOperation, personToken: string) {
		if (!createOrDelete.id) {
			throw new HttpException("Secondary document must have id", 422);
		}
		if (isSecondaryDocumentDelete(createOrDelete)) {
			await this.documentsService.checkHasReadRightsTo(createOrDelete.formID, personToken);
		} else {
			await this.documentsService.validate(createOrDelete, personToken);
		}
	}

	/** Assumes that data is already populated & validated */
	async pushMultiple(documents: (SecondaryDocument | SecondaryDocumentDelete & { collectionID: string })[]) {
		return this.warehouseService.pushMultiple(documents);
	}
}
