import { HttpException, Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { Flatten, KeyOf } from "src/typing.utils";
import { StoreService } from "src/store/store.service";
import { Document } from "@luomus/laji-schema";
import { DocumentCountItemResponse, Populated, StatisticsResponse } from "./documents.dto";
import { Query, getQueryVocabulary } from "src/store/store-query";
import { FormPermissionsService } from "src/forms/form-permissions/form-permissions.service";
import { FormsService } from "src/forms/forms.service";
import { CollectionsService } from "src/collections/collections.service";
import { Person } from "src/persons/person.dto";
import { NamedPlacesService } from "src/named-places/named-places.service";
import { isValidDate } from "src/utils";
import { NamedPlace } from "src/named-places/named-places.dto";
import { PrepopulatedDocumentService } from "src/named-places/prepopulated-document/prepopulated-document.service";
import { QueryCacheOptions } from "src/store/store-cache";
import { DocumentValidatorService } from "./document-validator/document-validator.service";
import { ValidationException } from "./document-validator/document-validator.utils";
import { ApiUserEntity } from "src/api-users/api-user.entity";

/** Allowed query keys of the external API of the document service */
export const allowedQueryKeysForExternalAPI = [
	"formID",
	"collectionID",
	"sourceID",
	"isTemplate",
	"namedPlaceID"
] as const;
type AllowedQueryKeysForExternalAPI = typeof allowedQueryKeysForExternalAPI[number];

const dateRangeKeys = [
	"gatheringEvent.dateBegin",
	"gatheringEvent.dateEnd",
] as const;
type DateRangeKey = typeof dateRangeKeys[number];

/** All keys that the internally constructed store queries can have. */
export const documentQueryKeys = [
	...allowedQueryKeysForExternalAPI,
	...dateRangeKeys,
	"creator",
	"editors",
	"id"
] as const;
export type DocumentQuery = Pick<Document, Exclude<typeof documentQueryKeys[number], DateRangeKey>>
	& Record<DateRangeKey, string>;

const { or, and, not, exists, range } = getQueryVocabulary<DocumentQuery>();

const DEFAULT_COLLECTION = "HR.1747";

type StoreCountAggregateResponse = {
	aggregations: {
		by_year: {
			buckets: {
				key_as_string: string
				doc_count: number
			}[]
		}
	}
}

@Injectable()
export class DocumentsService {

	private logger = new Logger(DocumentsService.name);

	constructor(
		@Inject("STORE_RESOURCE_SERVICE") public store: StoreService<Document, DocumentQuery>,
		private formPermissionsService: FormPermissionsService,
		private formsService: FormsService,
		private collectionsService: CollectionsService,

		@Inject(forwardRef(() => NamedPlacesService))
		private namedPlacesService: NamedPlacesService,

		@Inject(forwardRef(() => PrepopulatedDocumentService))
		private prepopulatedDocumentService: PrepopulatedDocumentService,

		@Inject(forwardRef(() => DocumentValidatorService))
		private documentValidatorService: DocumentValidatorService
	) {}

	async getClauseForPublicQuery(
		query: {[prop in AllowedQueryKeysForExternalAPI]?: Flatten<Document[prop]>},
		person: Person,
		observationYear?: number,
	): Promise<[Query<DocumentQuery>, QueryCacheOptions<DocumentQuery>]>  {
		// Allow simple search query terms as they are, but remove `isTemplate` & `collectionID` because they are added to
		// the query with more complex logic.
		const { collectionID, isTemplate } = query;
		delete query.isTemplate;
		delete query.collectionID;
		let storeQuery: Query<DocumentQuery> = and(query);
		let cacheConfig: QueryCacheOptions<DocumentQuery>;

		if (collectionID) {
			storeQuery.collectionID = await this.getCollectionIDs(collectionID);
			const permissions = await this.formPermissionsService.findByCollectionIDAndPerson(
				collectionID,
				person
			);
			cacheConfig = { primaryKeys: ["collectionID", "isTemplate"] };
			const viewableForAll = (await this.formsService.findListedByCollectionID(collectionID))
				.some(f => f.options?.documentsViewableForAll);
			if (
				!permissions?.admins.includes(person.id)
				&& (!viewableForAll || !permissions?.editors.includes(person.id))
			) {
				storeQuery = and(storeQuery, editorOrCreatorClause(person));
				cacheConfig = { enabled: false };
			}
		} else {
			storeQuery = and(storeQuery, editorOrCreatorClause(person));
			cacheConfig = { enabled: false };
		}

		if (!isTemplate) {
			storeQuery = and(storeQuery, or({ isTemplate: false }, not({ isTemplate: exists })));
		} else {
			storeQuery = and(storeQuery, { isTemplate: true });
		}

		if (observationYear) {
			storeQuery = and(
				storeQuery,
				dateRangeClause({ from: `${observationYear}-01-01`, to: `${observationYear}-12-31` })
			);
		}
		return [storeQuery, cacheConfig];
	}

	async getPage(
		query: {[prop in AllowedQueryKeysForExternalAPI]?: Flatten<Partial<Document[prop]>>},
		person: Person,
		observationYear?: number,
		page?: number,
		pageSize = 20,
		selectedFields?: (keyof Document)[]
	) {
		const [storeQuery, cacheConfig] = await this.getClauseForPublicQuery(query, person, observationYear);
		return await this.store.getPage(storeQuery, page, pageSize, selectedFields, cacheConfig);
	}

	async existsByNamedPlaceID(namedPlaceID: string, dateRange?: { from: string, to: string }, id?: string) {
		let query: Query<DocumentQuery> = { namedPlaceID };
		if (id) {
			query.id = id;
		}
		if (dateRange) {
			query = and(query, dateRangeClause(dateRange));
		}
		return !!(await this.store.findOne(query, undefined, { primaryKeys: ["namedPlaceID"] }));
	}

	async get(id: string, person: Person) {
		const document = await this.store.get(id);
		await this.checkHasReadRightsTo(document, person);
		return document;
	}

	async create(
		unpopulatedDocument: Document,
		person: Person,
		apiUser: ApiUserEntity
	) {
		const document = await this.populateMutably(unpopulatedDocument, person, apiUser);

		populateCreatorAndEditor(document, person);

		await this.validate(document, person);
		const created = await this.store.create(document) as Document & { id: string };
		await this.namedPlaceSideEffects(created, person);
		return created;
	}

	async update(
		id: string,
		unpopulatedDocument: Document,
		person: Person,
		apiUser: ApiUserEntity
	) {
		const existing = await this.store.get(id);

		if (!person.isImporter()) {
			if (!unpopulatedDocument.creator) {
				throw new HttpException("Missing creator", 422);
			}
			if (unpopulatedDocument.creator !== existing.creator) {
				throw new ValidationException({ "/creator": ["Cannot update a document with a different creator"]  });
			}
			if (existing.isTemplate && !unpopulatedDocument.isTemplate) {
				throw new HttpException("Can't make a template a non-template", 422);
			}
		}

		const document = await this.populateMutably(unpopulatedDocument, person, apiUser, false);

		if (!person.isImporter()) {
			document.editor = person.id;
		}

		await this.checkWriteAccess(existing, person, true);

		document.dateEdited = new Date().toISOString();
		if (existing.dateCreated) {
			document.dateCreated = existing.dateCreated;
		}

		await this.validate(document, person);
		const updated = await this.store.update(document as Document & { id: string });
		await this.namedPlaceSideEffects(updated, person);
		return updated;
	}

	private async checkWriteAccess(document: Document, person: Person, operationAllowedForEditor = false) {
		if (person.isImporter()) {
			return;
		}
		const { collectionID } = document;
		await this.formsService.checkWriteAccessIfDisabled(collectionID, person);
		if (!(await this.canAccessIfLocked(document, person))) {
			throw new ValidationException({ "/locked": ["Editing a locked document is not allowed"] });
		}
		if (collectionID) {
			if (!await this.formPermissionsService.hasEditRightsOf(collectionID, person)) {
				throw new HttpException("Insufficient rights to use this form", 403);
			}
			const permissions =
				await this.formPermissionsService.findByCollectionIDAndPerson(collectionID, person);
			if (permissions?.admins.includes(person.id)) {
				return;
			}
		}
		if (document.creator === person.id) {
			return;
		}
		if (operationAllowedForEditor && document.editors?.includes(person.id)) {
			return;
		}
		throw new HttpException("You are not owner or editor of this document", 403);
	}

	async delete(
		id: string,
		person: Person
	) {
		const existingDocument = await this.store.get(id);
		await this.checkWriteAccess(existingDocument, person);
		return this.store.delete(id);
	}

	private async canAccessIfLocked(document: Document, person: Person) {
		const { collectionID, locked } = document;
		if (!collectionID || !locked) {
			return true;
		}
		const permissions =
			await this.formPermissionsService.findByCollectionIDAndPerson(collectionID, person);
		if (!permissions?.admins.includes(person.id)) {
			return false;
		}

		return true;
	}

	async deriveCollectionIDMutably<T extends { formID?: string }>(mutableTarget: T)
		: Promise<T & { formID: string, collectionID: string }> {
		if (!mutableTarget.formID) {
			throw new ValidationException({ "/formID": ["Missing required property formID"] });
		}
		(mutableTarget as any).collectionID = (await this.formsService.get(mutableTarget.formID)).collectionID
			|| DEFAULT_COLLECTION;
		return mutableTarget as T & { formID: string, collectionID: string };
	}

	async populateMutably<T extends Document>(
		document: T,
		person: Person | undefined,
		apiUser: ApiUserEntity,
		overwriteSourceID = true
	) : Promise<Populated<T>> {
		const { systemID } = apiUser;
		if (!systemID) {
			throw new HttpException("No valid systemID could be found for the api user", 422);
		}

		// TODO remove after Mobiilivihko fixed. There's a issue about this.
		if (document.gatheringEvent && document.gatheringEvent.dateBegin === "") {
			delete document.gatheringEvent.dateBegin;
		}
		if (document.gatheringEvent && document.gatheringEvent.dateEnd === "") {
			delete document.gatheringEvent.dateEnd;
		}

		if (overwriteSourceID) {
			document.sourceID = systemID;
		} else if (!document.sourceID) {
			document.sourceID = systemID;
		}

		await this.deriveCollectionIDMutably(document);

		if (!document.publicityRestrictions) {
			document.publicityRestrictions = "MZ.publicityRestrictionsPublic";
		}

		const now = new Date().toISOString();
		const dateProps: KeyOf<Pick<Document, "dateEdited" | "dateCreated">>[] = ["dateEdited", "dateCreated"];
		dateProps.forEach(key => {
			if (!person?.isImporter() || !document[key]) {
				document[key] = now;
			}
		});

		return document as Populated<T>;
	};

	// TODO logic not yet copied from old api, need to double check:
	// * validation population against existing document; should be implemented in update method
	// * old api does 'linking', id checking etc in `prepareDocument`. Is it handled by store?
	async validate(
		document: Populated<Document>,
		person: Person
	) {
		const { collectionID } = document;

		await this.formsService.checkWriteAccessIfDisabled(collectionID, person);

		await this.checkHasReadRightsTo(document, person);

		if (!await this.formPermissionsService.hasEditRightsOf(collectionID, person)) {
			throw new HttpException("Insufficient rights to use this form", 403);
		}

		await this.documentValidatorService.validate(document);
	}

	async namedPlaceSideEffects(document: Document & { id: string }, person: Person) {
		if (person.isImporter()
			|| document.publicityRestrictions !== "MZ.publicityRestrictionsPublic"
			|| !document.formID
			|| !document.namedPlaceID
		) {
			return;
		}

		const form = await this.formsService.get(document.formID);
		if (!form.options?.useNamedPlaces) {
			return;
		}

		const place = await this.namedPlacesService.get(document.namedPlaceID);

		if (form.options?.namedPlaceOptions?.copyLatestDocumentToNamedPlace) {
			const placeDate = place.prepopulatedDocument ? getDateCounted(place.prepopulatedDocument) : undefined;
			const docCounted = getDateCounted(document);
			if (
				!isValidDate(placeDate) && (isValidDate(docCounted))
				|| isValidDate(placeDate) && isValidDate(docCounted) && (docCounted as Date) >= (placeDate as Date)
			) {
				if (documentHasNewNamedPlaceNote(document, place)) {
					place.notes = document.gatheringEvent?.namedPlaceNotes;
				}
				try {
					await this.prepopulatedDocumentService.assignFor(place, document);
				} catch (e) {
					this.logger.error("Failed to update prepopulatedDocument.",
						e,
						{ document: document.id, namedPlace: place.id, person: person.id }
					);
				}
			}
		} else if (documentHasNewNamedPlaceNote(document, place)) {
			place.notes = document.gatheringEvent?.namedPlaceNotes;
			await this.namedPlacesService.update(place.id, place, person);
		}
	}

	private async getCollectionIDs(collectionID: string) {
		const children = (await this.collectionsService.findDescendants(collectionID)).map(c => c.id);
		return [ collectionID, ...children ];
	}

	async checkHasReadRightsTo(document: Document, person: Person) {
		if (document.isTemplate && document.creator !== person.id) {
			throw new HttpException("Cannot access someone elses template", 403);
		}

		if (document.creator === person.id || document.editors?.includes(person.id) || person.isImporter()) {
			return;
		}

		const { formID, collectionID } = document;

		if (!formID) {
			throw new HttpException("Can't check read rights for a document missing formID", 403);
		}

		if (!collectionID) {
			throw new HttpException("Can't check read rights for a document missing collectionID", 403);
		}

		if (await this.formPermissionsService.isAdminOf(collectionID, person)) {
			return;
		}

		const form = await this.formsService.get(formID);

		const documentsViewableForAll = collectionID
			? (await this.formsService.findListedByCollectionID(collectionID))
				.some(f => f.options?.documentsViewableForAll)
			: form.options?.documentsViewableForAll;

		if (documentsViewableForAll) {
			const hasEditRights = await this.formPermissionsService.hasEditRightsOf(collectionID, person);
			if (!hasEditRights) {
				// eslint-disable-next-line max-len
				throw new HttpException("You don't have permission to the form and you are not the owner or an editor of the document", 403);
			}
			return;
		}

		throw new HttpException("Only document owner and editors can view the document", 403);
	}

	async getCountByYear(
		person: Person,
		collectionID?: string,
		namedPlaceID?: string,
		formID?: string
	): Promise<DocumentCountItemResponse[]> {
		const [query, cacheConfig] = await this.getClauseForPublicQuery(
			{ collectionID, namedPlaceID, formID },
			person
		);
		const search = {
			aggs: {
				by_year: {
					date_histogram: {
						field: "gatheringEvent.dateBegin",
						interval: "year"
					}
				}
			}
		};

		const data = await this.store.search<StoreCountAggregateResponse>(query, search, cacheConfig);
		return data.aggregations.by_year.buckets
			.map(doc => ({ year: doc.key_as_string.substring(0, 4), count: doc.doc_count }))
			.filter(doc => !!doc.count)
			.sort((a, b) => a.year.localeCompare(b.year));
	}

	async getStatistics(namedPlaceID: string): Promise<StatisticsResponse> {
		const documents = await this.store.getAll({ namedPlaceID }, "id", { primaryKeys: ["namedPlaceID"] });
		const dates: string[] = [];
		documents.forEach(document => {
			if (document.gatheringEvent?.dateBegin) {
				dates.push(document.gatheringEvent.dateBegin.slice(5));
			}
		});
		dates.sort();
		const mid = Math.floor(dates.length / 2);

		return { dateMedian: dates[mid] as string };
	}
}

const getDateCounted = (document: Pick<Document, "gatheringEvent" | "gatherings">): Date | undefined  => {
	if (document.gatheringEvent) {
		const date = document.gatheringEvent.dateEnd || document.gatheringEvent.dateBegin;
		if (date) {
			return new Date(Date.parse(date));
		}
	}
	if (document.gatherings && document.gatherings.length > 0) {
		return document.gatherings.reduce<Date | undefined>((prevDate, gathering) => {
			const current = gathering.dateEnd || gathering.dateBegin;
			if (!current) {
				return prevDate;
			}
			const currentDate = new Date(Date.parse(current));
			if (!prevDate || currentDate > prevDate) {
				return currentDate;
			}
		}, undefined);
	}
};

const documentHasNewNamedPlaceNote = (document: Document, place: NamedPlace) => {
	const notes = document.gatheringEvent?.namedPlaceNotes;
	if (notes && notes !== place.notes) {
		return notes;
	}
};

const dateRangeClause = (dateRange: { from: string, to: string }) =>
	or(
		{ "gatheringEvent.dateBegin": range(dateRange.from, dateRange.to) },
		and({
			"gatheringEvent.dateBegin": range("*", dateRange.to),
			"gatheringEvent.dateEnd": range(dateRange.from, "*")
		})
	);

const editorOrCreatorClause = (person: Person) => or({ creator: person.id, editors: person.id });

export const populateCreatorAndEditor = <T extends { creator?: string; editor?: string }>
	(document: T, person: Person): T => {
	if (!person.isImporter()) {
		document.creator = person.id;
		document.editor = person.id;
	}
	return document;
};
