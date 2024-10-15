import { Inject, Injectable } from "@nestjs/common";
import { WAREHOUSE_CLIENT } from "src/provider-tokens";
import { RestClientService } from "src/rest-client/rest-client.service";
import { SecondaryDocument, SecondaryDocumentDelete } from "src/documents/documents.dto";
import { SingleQueryResponse } from "./warehouse.dto";

// TODO This is how the requests are done by old API. Ask from Esko if there's a better way to do this since the
// swagger typings don't work for the used. There's a push DELETE endpoint so this delete via POST seems weird.
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

	async pushMultiple(document: (SecondaryDocument | SecondaryDocumentDelete & { collectionID: string })[]) {
		const roots = document.map(document => (document as SecondaryDocumentDelete).delete
			? { id: document.id, collectionID: document.collectionID }
			: { document }
		);
		return this.client.post<unknown>("push",
			{
				schema: "lajistore-secondary-data",
				roots
			}
		);
	}
}
