import { HttpException, Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { Flatten, KeyOf } from "src/type-utils";
import { StoreService } from "src/store/store.service";
import { Document } from "@luomus/laji-schema";
import { DocumentCountItemResponse, Populated, StatisticsResponse } from "./documents.dto";
import { Query, getQueryVocabulary } from "src/store/store-query";
import { FormPermissionsService } from "src/forms/form-permissions/form-permissions.service";
import { PersonsService } from "src/persons/persons.service";
import { FormsService } from "src/forms/forms.service";
import { CollectionsService } from "src/collections/collections.service";
import { Person } from "src/persons/person.dto";
import { NamedPlacesService } from "src/named-places/named-places.service";
import { isValidDate } from "src/utils";
import { NamedPlace } from "src/named-places/named-places.dto";
import { PrepopulatedDocumentService } from "src/named-places/prepopulated-document/prepopulated-document.service";
import { QueryCacheOptions, StoreCacheOptions } from "src/store/store-cache";
import { ApiUsersService } from "src/api-users/api-users.service";
import { DocumentValidatorService } from "./document-validator/document-validator.service";
import { ValidationException } from "./document-validator/document-validator.utils";

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
type DocumentQuery = Pick<Document, Exclude<typeof documentQueryKeys[number], DateRangeKey>>
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
		@Inject("STORE_RESOURCE_SERVICE") public store: StoreService<Document>,
		private personsService: PersonsService,
		private formPermissionsService: FormPermissionsService,
		private formsService: FormsService,
		private collectionsService: CollectionsService,
		private apiUsersService: ApiUsersService,

		@Inject(forwardRef(() => NamedPlacesService))
		private namedPlacesService: NamedPlacesService,

		@Inject(forwardRef(() => PrepopulatedDocumentService))
		private prepopulatedDocumentService: PrepopulatedDocumentService,

		@Inject(forwardRef(() => DocumentValidatorService))
		private documentValidatorService: DocumentValidatorService
	) {}

	async getClauseForPublicQuery(
		query: {[prop in AllowedQueryKeysForExternalAPI]?: Flatten<Document[prop]>},
		personToken: string,
		observationYear?: number,
	): Promise<[Query<DocumentQuery>, Partial<StoreCacheOptions<Document>>]>  {
		// Allow simple search query terms as they are, but remove `isTemplate` & `collectionID` because they are added to
		// the query with more complex logic.
		const { collectionID, isTemplate } = query;
		delete query.isTemplate;
		delete query.collectionID;
		let storeQuery: Query<DocumentQuery> = and(query);
		let cacheConfig: QueryCacheOptions<Document>;

		const person = await this.personsService.getByToken(personToken);
		if (collectionID) {
			storeQuery.collectionID = await this.getCollectionIDs(collectionID);
			const permissions = await this.formPermissionsService.findByCollectionIDAndPersonToken(
				collectionID,
				personToken
			);
			cacheConfig = { primaryKeys: ["collectionID", "isTemplate"] };
			const viewableForAll = (await this.formsService.findListedByCollectionID(collectionID))
				.some(f => f.options?.documentsViewableForAll);
			if (!viewableForAll || !(
				permissions?.editors.includes(person.id)
				|| permissions?.admins.includes(person.id)
			)) {
				storeQuery = and(storeQuery, editorOrCreatorClause(person));
				cacheConfig = { primaryKeys: ["creator", "isTemplate"] };
			}
		} else {
			storeQuery = and(storeQuery, editorOrCreatorClause(person));
			cacheConfig = { primaryKeys: ["creator", "isTemplate"] };
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
		personToken: string,
		observationYear?: number,
		page?: number,
		pageSize = 20,
		selectedFields?: (keyof Document)[]
	) {
		const [storeQuery, cacheConfig] = await this.getClauseForPublicQuery(query, personToken, observationYear);
		return await this.store.getPage(storeQuery, page, pageSize, selectedFields, cacheConfig);
	}

	async existsByNamedPlaceID(namedPlaceID: string, dateRange?: { from: string, to: string }, id?: string) {
		 // TODO the typings are problematic for query terms that are not keys of the resource, e.g.,
		// "gatheringEvent.dateBegin"
		let query: Query<any> = { namedPlaceID };
		if (id) {
			query.id = id;
		}
		if (dateRange) {
			query = and(query, dateRangeClause(dateRange));
		}
		return !!(await this.store.findOne(query, undefined, { primaryKeys: ["namedPlaceID"] }));
	}

	async get(id: string, personToken: string) {
		const document = await this.store.get(id);
		await this.checkHasReadRightsTo(document, personToken);
		return document;
	}

	async create(
		unpopulatedDocument: Document,
		personToken: string,
		accessToken: string
	) {
		if (unpopulatedDocument.id) {
			throw new HttpException("You should not specify ID when adding primary data!", 406);
		}

		const person = await this.personsService.getByToken(personToken);
		const document = await this.populateMutably(unpopulatedDocument, person, accessToken);

		if (!person.isImporter()) {
			document.creator = person.id;
			document.editor = person.id;
		}

		await this.validate(document, personToken);
		const created = await this.store.create(document) as Document & { id: string };
		await this.namedPlaceSideEffects(created, personToken);
		return created;
	}

	async update(
		id: string,
		unpopulatedDocument: Document,
		personToken: string,
		accessToken: string
	) {
		const person = await this.personsService.getByToken(personToken);

		const existing = await this.store.get(id);
		// TODO remove after store handles POST/PUT properly with separate methods.
		if (!unpopulatedDocument.id) {
			throw new HttpException("You should provide the document ID in the body", 422);
		}

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

		const document = await this.populateMutably(unpopulatedDocument, person, accessToken, false);

		if (!person.isImporter()) {
			document.editor = person.id;
		}

		await this.checkWriteAccess(existing, personToken, true);

		document.dateEdited = new Date().toISOString();
		if (existing.dateCreated) {
			document.dateCreated = existing.dateCreated;
		}

		await this.validate(document, personToken);
		const updated = await this.store.update(document as Document & { id: string });
		await this.namedPlaceSideEffects(updated, personToken);
		return updated;
	}

	private async checkWriteAccess(document: Document, personToken: string, operationAllowedForEditor = false) {
		const person = await this.personsService.getByToken(personToken);
		const { collectionID } = document;
		await this.formsService.checkWriteAccessIfDisabled(collectionID, person);
		if (!(await this.canAccessIfLocked(document, personToken))) {
			throw new ValidationException({ "/locked": ["Editing a locked document is not allowed"] });
		}
		if (collectionID) {
			if (!await this.formPermissionsService.hasEditRightsOf(collectionID, personToken)) {
				throw new HttpException("Insufficient rights to use this form", 403);
			}
			const permissions =
				await this.formPermissionsService.getByCollectionIDAndPersonToken(collectionID, personToken);
			if (permissions?.admins.includes(person.id)) {
				return;
			}
		}
		if (document.creator === person.id) {
			return;
		}
		if (!operationAllowedForEditor && !document.editors?.includes(person.id)) {
			throw new HttpException("You are not owner of this document", 403);
		}
		throw new HttpException("You are not owner or editor of this document", 403);
	}

	async delete(
		id: string,
		personToken: string
	) {
		const existingDocument = await this.store.get(id);
		await this.checkWriteAccess(existingDocument, personToken);
		return this.store.delete(id);
	}

	private async canAccessIfLocked(document: Document, personToken: string) {
		const { collectionID, locked } = document;
		if (!collectionID || !locked) {
			return true;
		}
		const person = await this.personsService.getByToken(personToken);
		const permissions =
			await this.formPermissionsService.getByCollectionIDAndPersonToken(collectionID, personToken);
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
		accessToken: string,
		overwriteSourceID = true
	) : Promise<Populated<T>> {
		const apiUser = await this.apiUsersService.getByAccessToken(accessToken);

		const { systemID } = apiUser;
		if (!systemID) {
			throw new HttpException("No valid systemID could be found for the api user", 422);
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
		personToken: string
	) {
		const { collectionID } = document;
		const person = await this.personsService.getByToken(personToken);

		await this.formsService.checkWriteAccessIfDisabled(collectionID, person);

		await this.checkHasReadRightsTo(document, personToken);

		if (!await this.formPermissionsService.hasEditRightsOf(collectionID, personToken)) {
			throw new HttpException("Insufficient rights to use this form", 403);
		}

		await this.documentValidatorService.validate(document);
	}

	async namedPlaceSideEffects(document: Document & { id: string }, personToken: string) {
		const person = await this.personsService.getByToken(personToken);
		if (person.isImporter()
			|| document.publicityRestrictions !== "MZ.publicityRestrictionsPublic"
			|| !document.formID
			|| !document.namedPlaceID
		) {
			return;
		}

		const form = await this.formsService.get(document.id);
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
			await this.namedPlacesService.update(place.id, place, personToken);
		}
	}

	private async getCollectionIDs(collectionID: string) {
		const children = (await this.collectionsService.findDescendants(collectionID)).map(c => c.id);
		return [ collectionID, ...children ];
	}

	async checkHasReadRightsTo(document: Document, personToken: string) {
		const person = await this.personsService.getByToken(personToken);

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

		const form = await this.formsService.get(formID);

		const documentsViewableForAll = collectionID
			? (await this.formsService.findListedByCollectionID(collectionID))
				.some(f => f.options?.documentsViewableForAll)
			: form.options?.documentsViewableForAll;

		if (documentsViewableForAll) {
			const hasEditRights = await this.formPermissionsService.hasEditRightsOf(collectionID, personToken);
			if (!hasEditRights) {
				// eslint-disable-next-line max-len
				throw new HttpException("You don't have permission to the form and you are not the owner or an editor of the document", 403);
			}
			return;
		}

		throw new HttpException("Only document owner and editors can view the document", 403);
	}

	async getCountByYear(
		personToken: string,
		collectionID?: string,
		namedPlaceID?: string,
		formID?: string
	): Promise<DocumentCountItemResponse[]> {
		const [query, cacheConfig] = await this.getClauseForPublicQuery(
			{ collectionID, namedPlaceID, formID },
			personToken
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
