import { Inject, Injectable } from "@nestjs/common";
import { WAREHOUSE_CLIENT } from "src/provider-tokens";
import { RestClientService } from "src/rest-client/rest-client.service";
import { SecondaryDocument, SecondaryDocumentDelete, isSecondaryDocumentDelete } from "src/documents/documents.dto";
import { SingleQueryResponse } from "./warehouse.dto";

@Injectable()
export class WarehouseService {
	constructor(
		@Inject(WAREHOUSE_CLIENT) private client: RestClientService
	) {}

	async get(id: string) {
		return this.client.get<SingleQueryResponse>("query/single",
			{ params: {
				documentId: id,
			} }
		);
	}

	async push(document: SecondaryDocument) {
		return this.client.post<unknown>("push",
			{
				schema: "lajistore-secondary-data",
				roots: [{ document }]
			}
		);
	}

	async pushDelete(id: string, collectionID: string) {
		return this.client.post<unknown>("push",
			{
				schema: "lajistore-secondary-data",
				roots: [{
					document: { id, collectionID }
				}]
			}
		);
	}

	async pushMultiple(documents: (SecondaryDocument | SecondaryDocumentDelete & { collectionID: string })[]) {
		const roots = documents.map(document => ({
			document: isSecondaryDocumentDelete(document)
				? { id: document.id, collectionID: document.collectionID }
				: document
		}));
		return this.client.post<unknown>("push",
			{
				schema: "lajistore-secondary-data",
				roots
			}
		);
	}
}
