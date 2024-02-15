import { HttpException, Injectable } from "@nestjs/common";
import { StoreService } from "src/store/store.service";
import { NamedPlace } from "./named-places.dto";
import { PersonsService } from "src/persons/persons.service";
import { storePageAdapter } from "src/pagination";
import { or, and, StoreQuery, LiteralMap } from "src/store/store-query";
import { FormsService } from "src/forms/forms.service";
import {
	FormPermissionsService, hasEditRightsOf, isAdminOf
} from "src/forms/form-permissions/form-permissions.service";
import { CACHE_1_H } from "src/utils";
import { PrepopulatedDocumentService } from "./prepopulated-document/prepopulated-document.service";

@Injectable()
export class NamedPlacesService {

	private store = this.storeService.forResource<NamedPlace>("namedPlace", {
		serializeInto: NamedPlace, cache: CACHE_1_H * 6
	});

	constructor(
		private storeService: StoreService,
		private personsService: PersonsService,
		private formsService: FormsService,
		private formPermissionsService: FormPermissionsService,
		private prepopulatedDocumentService: PrepopulatedDocumentService
	) {}

	async getPage(
		query: LiteralMap<NamedPlace, "AND">,
		personToken?: string,
		includePublic?: boolean,
		page?: number,
		pageSize = 20,
		selectedFields?: (keyof NamedPlace)[]
	) {
		let storeQuery: StoreQuery<NamedPlace>;

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

		return storePageAdapter(await this.store.getPage(storeQuery, page, pageSize, selectedFields));
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

		const person = await this.personsService.getByToken(personToken);
		if (place.collectionID) {
			await this.formsService.checkPersonCanAccessCollectionID(place.collectionID, person);
		}

		if (place.public) {
			this.validateEditingAsPublicAllowed(place, personToken);
		}

		if (!person.isImporter() && !place.owners.includes(person.id)) {
			place.owners.push(person.id);
		}

		const prepopulatedDocument = await this.prepopulatedDocumentService.getAugmentedFor(place);
		if (prepopulatedDocument) {
			await this.prepopulatedDocumentService.validate(prepopulatedDocument, place.collectionID);
			await this.prepopulatedDocumentService.setFor(place, prepopulatedDocument);
		}

		return this.store.create(place);
	}

	private async validateEditingAsPublicAllowed({ collectionID }: NamedPlace, personToken: string): Promise<void> {
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
			throw new HttpException("You cannot make public named places", 403);
		}
		const allowedToAddPublic = await this.formsService.findFormByCollectionIDFromHeritanceByRule(
			collectionID,
			f => !!f.options.allowAddingPublicNamedPlaces
		);
		if (!allowedToAddPublic) {
			throw new HttpException("You cannot make public named places", 403);
		}
	}
}

