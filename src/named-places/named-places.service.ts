import { HttpException, Inject, Injectable } from "@nestjs/common";
import { StoreService } from "src/store/store.service";
import { NamedPlace } from "./named-places.dto";
import { PersonsService } from "src/persons/persons.service";
import { getQueryVocabulary, Query, QueryLiteralMap } from "src/store/store-query";
import { FormsService } from "src/forms/forms.service";
import { FormPermissionsService } from "src/forms/form-permissions/form-permissions.service";
import { PrepopulatedDocumentService } from "./prepopulated-document/prepopulated-document.service";
import { DocumentsService } from "src/documents/documents.service";
import { CollectionsService } from "src/collections/collections.service";
import { QueryCacheOptions } from "src/store/store-cache";
import { dateToISODate } from "src/utils";
import { MailService } from "src/mail/mail.service";

const { or, and, not, exists } = getQueryVocabulary<NamedPlace>();

export const AllowedPageQueryKeys = [
	"id"
	, "alternativeIDs"
	, "municipality"
	, "birdAssociationArea"
	, "collectionID"
	, "tags"
	, "public"
] as const;

@Injectable()
export class NamedPlacesService {

	constructor(
		@Inject("STORE_RESOURCE_SERVICE") private store: StoreService<NamedPlace>,
		private personsService: PersonsService,
		private formsService: FormsService,
		private formPermissionsService: FormPermissionsService,
		private prepopulatedDocumentService: PrepopulatedDocumentService,
		private documentService: DocumentsService,
		private collectionsService: CollectionsService,
		private mailService: MailService
	) {}

	async getPage(
		query: QueryLiteralMap<Pick<NamedPlace, typeof AllowedPageQueryKeys[number]>, "AND">,
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
		let cacheConfig: QueryCacheOptions<NamedPlace> = { primaryKeys: [ "collectionID" ] };

		if (personToken) {
			const person = await this.personsService.getByToken(personToken);
			const readAllowedClause = or({ owners: person.id, editors: person.id });
			if (includePublic) {
				readAllowedClause.public = true;
			}
			storeQuery = and(query, readAllowedClause);
		} else {
			query.public = true;
			storeQuery = query;
		}

		if (!query.collectionID && !query.id) {
			storeQuery = and(storeQuery, not({ collectionID: exists }));
		}

		if (!query.collectionID && query.id) { // The only configuration where collectionID is not in the query.
			cacheConfig = { primaryKeys: ["id"] };
		}

		return await this.store.getPage(storeQuery, page, pageSize, selectedFields, cacheConfig);
	}

	private async getCollectionIDs(collectionID: string) {
		const children = (await this.collectionsService.findDescendants(collectionID)).map(c => c.id);
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

		if (!place.isReadableFor(person)) {
			throw new HttpException("You are not an editor or an owner of the place", 403);
		}

		return place;
	}

	async create(place: NamedPlace, personToken: string) {
		if (place.id) {
			throw new HttpException("You should not specify ID when adding!", 406);
		}

		const person = await this.personsService.getByToken(personToken);
		if (!person.isImporter() && !place.owners.includes(person.id)) {
			place.owners.push(person.id);
		}

		await this.checkWriteAccess(place, personToken);

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

	async reserve(id: string, personToken: string, personID?: string, until?: string) {
		const place = await this.get(id);

		if (!place.collectionID) {
			throw new HttpException("Can't reserve a place that doesn't belong to a collection", 422);
		}

		const isAdmin = await this.formPermissionsService.isAdminOf(place.collectionID, personToken);

		if (!isAdmin && place.reserve?.until && new Date(place.reserve.until) >= new Date()) {
			throw new HttpException("The place is already reserved", 400);
		}

		let untilDate: Date;
		if (until) {
			untilDate = new Date(until);
			if (isNaN(Date.parse(untilDate as unknown as string))) { // TS is wrong here, `Date.parse()` accepts `Date`.
				throw new HttpException("'until' has bad date format, should be YYYY-MM-DD", 422);
			}
			if (untilDate < new Date()) {
				throw new HttpException("You can't reserve to a date in the past", 422);
			}
			if (!isAdmin) {
				const oneYearAway = new Date();
				oneYearAway.setFullYear(oneYearAway.getFullYear() + 1);
				if (untilDate > oneYearAway) {
					throw new HttpException("You can't reserve to a date so far away in the future", 400);
				}
			}
		} else {
			untilDate = new Date();
			untilDate.setMonth(untilDate.getMonth() + 1);
		}

		if (personID && !isAdmin) {
			throw new HttpException("Only admin can reserve to other user", 403);
		}

		const forPerson = personID
			? await this.personsService.getByPersonId(personID)
			: await this.personsService.getByToken(personToken);
		place.reserve = { reserver: forPerson.id, until: dateToISODate(untilDate) };

		const updated = await this.update(place.id, place, personToken);
		const person = await this.personsService.getByToken(personToken);
		void this.mailService.sendNamedPlaceReserved(person, { place, until: dateToISODate(untilDate) });
		return updated;
	}

	async cancelReservation(id: string, personToken: string) {
		const place = await this.get(id, personToken);
		const person = await this.personsService.getByToken(personToken);
		if (place.reserve?.reserver !== person.id
			&& !(place.collectionID && await this.formPermissionsService.isAdminOf(place.collectionID, personToken))
		) {
			throw new HttpException("You can't remove other users reservation if you are not admin", 403);
		}
		delete place.reserve;
		return this.store.update(place);
	}

	private async checkWriteAccess(place: NamedPlace, personToken: string): Promise<void> {
		const { collectionID, public: isPublic, owners } = place;
		const person = await this.personsService.getByToken(personToken);

		if (!collectionID && owners.includes(person.id)) {
			return;
		}

		if (!collectionID) {
			throw new HttpException("You don't have access to this place", 403);
		}

		await this.formsService.checkPersonCanAccessCollectionID(collectionID, person);

		if (!isPublic || await this.formPermissionsService.isAdminOf(collectionID, personToken)) {
			return;
		}

		if (!await this.formPermissionsService.hasEditRightsOf(collectionID, personToken)) {
			throw new HttpException("Insufficient permission to form to make public named places", 403);
		}
		const allowedToAddPublic = await this.formsService.findFor(
			collectionID,
			f => f.options.namedPlaceOptions?.allowAddingPublic
		);
		if (!allowedToAddPublic) {
			throw new HttpException("Adding public places for this collection isn't allowed", 403);
		}
	}
}
