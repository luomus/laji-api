import { HttpException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { DocumentsService, populateCreatorAndEditorMutably } from "./documents.service";
import { WarehouseService } from "src/warehouse/warehouse.service";
import { PopulatedSecondaryDocumentOperation, SecondaryDocument, SecondaryDocumentDelete, SecondaryDocumentOperation,
	isSecondaryDocument, isSecondaryDocumentDelete, isSecondaryDocumentOperation } from "./documents.dto";
import { Person } from "src/persons/person.dto";
import { ConfigService } from "@nestjs/config";
import { Lang } from "src/common.dto";

@Injectable()
export class SecondaryDocumentsService {

	constructor(
		private warehouseService: WarehouseService,
		@Inject(forwardRef(() => DocumentsService)) private documentsService: DocumentsService,
		private config: ConfigService
	) {}

	async create(createOrDelete: SecondaryDocumentDelete, person: Person, lang: Lang)
		: Promise<SecondaryDocumentDelete>
	async create(createOrDelete: SecondaryDocument, person: Person, lang: Lang)
		: Promise<SecondaryDocument>
	async create(createOrDelete: SecondaryDocumentOperation, person: Person, lang: Lang)
		: Promise<SecondaryDocument | SecondaryDocumentOperation>
	{
		const populatedCreateOrDelete = await this.populateMutably(createOrDelete, person);
		await this.validate(populatedCreateOrDelete, person, lang);
		await (isSecondaryDocumentDelete(populatedCreateOrDelete)
			? this.warehouseService.pushDelete(populatedCreateOrDelete.id, populatedCreateOrDelete.collectionID)
			: this.warehouseService.push(populatedCreateOrDelete));
		return populatedCreateOrDelete;
	}

	async populateMutably(
		createOrDelete: SecondaryDocumentOperation,
		person?: Person
	) : Promise<PopulatedSecondaryDocumentOperation> {
		const populated = (isSecondaryDocumentDelete(createOrDelete)
			? await this.documentsService.deriveCollectionIDMutably(createOrDelete)
			: await this.documentsService.populateCommonsMutably(createOrDelete, person));
		if (person && !isSecondaryDocumentDelete(populated)) {
			populateCreatorAndEditorMutably(populated, person);
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

	async validate(createOrDelete: PopulatedSecondaryDocumentOperation, person: Person, lang: Lang) {
		if (!isSecondaryDocumentOperation(createOrDelete)) {
			throw new HttpException("Secondary document must have id", 422);
		}
		if (isSecondaryDocument(createOrDelete)) {
			await this.documentsService.validate(createOrDelete, person, undefined, lang);
		}
	}

	/** Assumes that data is already populated & validated */
	async pushMultiple(documents: (SecondaryDocument | SecondaryDocumentDelete & { collectionID: string })[]) {
		return this.warehouseService.pushMultiple(documents);
	}
}
