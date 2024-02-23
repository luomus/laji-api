import { HttpException, Inject, Injectable } from "@nestjs/common";
import { StoreService } from "src/store/store.service";
import { NamedPlace } from "./named-places.dto";
import { PersonsService } from "src/persons/persons.service";
import { storePageAdapter } from "src/pagination";
import { or, and, not, exists, Query, QueryLiteralMap } from "src/store/store-query";
import { FormsService } from "src/forms/forms.service";
import {
	FormPermissionsService, hasEditRightsOf, isAdminOf
} from "src/forms/form-permissions/form-permissions.service";
import { CACHE_1_H } from "src/utils";
import { PrepopulatedDocumentService } from "./prepopulated-document/prepopulated-document.service";
import { DocumentsService } from "src/documents/documents.service";
import { CollectionsService } from "src/collections/collections.service";
import { RestClientService } from "src/rest-client/rest-client.service";

@Injectable()
export class NamedPlacesService {
	private store = new StoreService(this.storeClient, {
		resource: "namedPlace", serializeInto: NamedPlace, cache: CACHE_1_H * 6,
	});

	constructor(
		@Inject("STORE_REST_CLIENT") private storeClient: RestClientService,
		private personsService: PersonsService,
		private formsService: FormsService,
		private formPermissionsService: FormPermissionsService,
		private prepopulatedDocumentService: PrepopulatedDocumentService,
		private documentService: DocumentsService,
		private collectionsService: CollectionsService
	) {}

	async getPage(
		query: QueryLiteralMap<NamedPlace, "AND">,
		personToken?: string,
		includePublic?: boolean,
		page?: number,
		pageSize = 20,
		selectedFields?: (keyof NamedPlace)[]
	) {
		if (typeof query.collectionID === "string") {
			query.collectionID = await this.getCollectionIDs(query.collectionID);
		}

		let storeQuery: Query<NamedPlace>;

		if (personToken) {
			const person = await this.personsService.getByToken(personToken);
			const readAllowedClause = or<NamedPlace>({ owners: person.id, editors: person.id });
			if (includePublic) {
				readAllowedClause.public = true;
			}
			storeQuery = and(query, readAllowedClause);
		} else {
			query.public = true;
			storeQuery = query;
		}

		if (!query.collectionID && !query.id) {
			storeQuery = and(storeQuery, not<NamedPlace>({ collectionID: exists }));
		}

		return storePageAdapter(await this.store.getPage(storeQuery, page, pageSize, selectedFields));
	}

	private async getCollectionIDs(collectionID: string) {
		const children = (await this.collectionsService.findChildren(collectionID)).map(c => c.id);
		return [ collectionID, ...children ];
	}

	async get(id: string, personToken?: string) {
		const place = await this.store.get(id);

		if (place.public) {
			return place;
		}

		if (!personToken) {
			throw new HttpException("You must provide a personToken when fetching private named places", 403);
		}

		const person = await this.personsService.getByToken(personToken);

		if (!place.isEditableFor(person)) {
			throw new HttpException("You are not an editor or an owner of the place", 403);
		}

		return place;
	}

	async create(place: NamedPlace, personToken: string) {
		if (place.id) {
			throw new HttpException("You should not specify ID when adding!", 406);
		}

		await this.checkWriteAccess(place, personToken);

		const person = await this.personsService.getByToken(personToken);
		if (!person.isImporter() && !place.owners.includes(person.id)) {
			place.owners.push(person.id);
		}

		await this.prepopulatedDocumentService.augment(place);

		return this.store.create(place);
	}

	async update(id: string, place: NamedPlace, personToken: string) {
		const existing = await this.get(id, personToken);

		await this.checkWriteAccess(existing, personToken);

		const person = await this.personsService.getByToken(personToken);
		if (!person.isImporter()
			&& existing.owners.includes(person.id)
			&& !place.owners.includes(person.id)
		) {
			place.owners.push(person.id);
		}

		await this.prepopulatedDocumentService.augment(place);
		return this.store.update(place);
	}

	async delete(id: string, personToken: string) {
		const existing = await this.get(id, personToken);
		await this.checkWriteAccess(existing, personToken);

		if (existing.public) {
			const hasDocuments = !!(await this.documentService.findOne({ namedPlaceID: id }, "id"));
			if (hasDocuments) {
				throw new HttpException("Can't delete public place that has documents", 422);
			}
		}

		return this.store.delete(id);
	}

	async checkWriteAccess(place: NamedPlace, personToken: string) {
		const person = await this.personsService.getByToken(personToken);
		if (place.collectionID) {
			await this.formsService.checkPersonCanAccessCollectionID(place.collectionID, person);
		}

		if (place.public) {
			await this.checkEditingAsPublicAllowed(place, personToken);
		}
	}

	private async checkEditingAsPublicAllowed({ collectionID }: NamedPlace, personToken: string): Promise<void> {
		if (!collectionID) {
			return;
		}

		const permissions = await this.formPermissionsService.getByCollectionIDAndPersonToken(
			collectionID,
			personToken
		);
		const person = await this.personsService.getByToken(personToken);
		const isAdmin = isAdminOf(permissions, person);

		if (isAdmin) {
			return;
		}

		if (!hasEditRightsOf(permissions, person)) {
			throw new HttpException("Insufficient permission to form to make public named places", 403);
		}
		const allowedToAddPublic = await this.formsService.findFor(
			collectionID,
			f => f.options.allowAddingPublicNamedPlaces
		);
		if (!allowedToAddPublic) {
			throw new HttpException("Adding public places for this collection isn't allowed", 403);
		}
	}
}
