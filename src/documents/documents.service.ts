import { HttpException, Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { Flatten, KeyOf } from "src/type-utils";
import { StoreService } from "src/store/store.service";
import { Document, Populated, SecondaryDocument, UnpopulatedDocument, ValidationErrorFormat } from "./documents.dto";
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
import { QueryCacheOptions } from "src/store/store-cache";
import { ApiUsersService } from "src/api-users/api-users.service";
import { DocumentValidatorService } from "./document-validator/document-validator.service";

const dateRangeKeys = [
	"gatheringEvent.dateBegin",
	"gatherings.dateBegin",
	"gatherings.units.unitGathering.dateBegin"
] as const;
type DateRangeKey = typeof dateRangeKeys[number];
// type DocumentQuery = Document & Record<DateRangeKey, string>

/** Allowed filters for the external API of the document service */
export const allowedQueryKeys = [
	"formID",
	"collectionID",
	"sourceID",
	"isTemplate",
	"namedPlaceID",
] as const;
type AllowedQueryKeys = typeof allowedQueryKeys[number];

/** All possible keys that the constructed store queries can have. */
export const documentQueryKeys = [...allowedQueryKeys, "creator", "editors", ...dateRangeKeys] as const;
type DocumentQuery = Pick<Document, Exclude<typeof documentQueryKeys[number], DateRangeKey>>
	& Record<DateRangeKey, string>;

const { or, and, not, exists } = getQueryVocabulary<DocumentQuery>();

const editorOrCreator = (person: Person) => or({ creator: person.id, editors: person.id });

const DEFAULT_COLLECTION = "HR.1747";

@Injectable()
export class DocumentsService {

	private logger = new Logger(DocumentsService.name);

	constructor(
		@Inject("STORE_RESOURCE_SERVICE") private store: StoreService<Document>,
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

	// findOne = this.store.findOne.bind(this.store);

	async getPageByObservationYear(
		query: {[prop in AllowedQueryKeys]: Flatten<Partial<Document[prop]>>},
		personToken: string,
		observationYear?: number,
		page?: number,
		pageSize = 20,
		selectedFields?: (keyof Document)[]
	) {
		const { formID, collectionID, isTemplate } = query;
		delete query.isTemplate;
		let storeQuery: Query<DocumentQuery> = and(query);
		let cacheConfig: QueryCacheOptions<Document>;

		if (formID) {
			await this.checkCanAccessForm(formID, personToken);
		}

		const person = await this.personsService.getByToken(personToken);
		if (collectionID) {
			storeQuery.collectionID = await this.getCollectionIDs(collectionID);
			const permissions = await this.formPermissionsService.getByCollectionIDAndPersonToken(
				collectionID,
				personToken
			);
			cacheConfig = { primaryKeys: ["collectionID"] };
			if (formID && !permissions?.admins.includes(person.id)) {
				storeQuery = and(storeQuery, editorOrCreator(person));
				cacheConfig = { primaryKeys: ["creator"] };
			}
		} else {
			storeQuery = and(storeQuery, editorOrCreator(person));
			cacheConfig = { primaryKeys: ["creator"] };
		}

		if (!isTemplate) {
			storeQuery = and(storeQuery, or({ isTemplate: false }, not({ isTemplate: exists })));
		}
		if (observationYear) {
			storeQuery = and(
				storeQuery,
				dateRangeClause({ from: `${observationYear}-01-01`, to: `${observationYear}-12-31]` })
			);
		}
		return await this.store.getPage(storeQuery, page, pageSize, selectedFields, cacheConfig);
	}

	async existsByNamedPlaceID(namedPlaceID: string, dateRange?: { from: string, to: string }, id?: string) {
		let query: Query<Document> = { namedPlaceID };
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
		const person = await this.personsService.getByToken(personToken);
		if (document.creator === person.id || document.editors?.includes(person.id) || person.isImporter()) {
			return document;
		}
		if (document.formID) {
			await this.checkCanAccessForm(document.formID, personToken);
		}
		return document;
	}

	async create(
		unpopulatedDocument: UnpopulatedDocument,
		personToken: string,
		accessToken: string,
		validationErrorFormat?: ValidationErrorFormat
	) {
		const person = await this.personsService.getByToken(personToken);
		const document = await this.populateDocumentMutably(unpopulatedDocument, person, accessToken);
		if (document.id) {
			throw new HttpException("You should not specify ID when adding primary data!", 406);
		}
		await this.validate(document, personToken, validationErrorFormat);
		const created = await this.store.create(document);
		await this.namedPlaceSideEffects(created, personToken);
		return created;
	}

	async deriveCollectionIDMutably<T extends { formID?: string }>(mutableTarget: T)
		: Promise<T & { formID: string, collectionID: string }> {
		if (!mutableTarget.formID) {
			throw new HttpException("Missing required param formID", 422);
		}
		(mutableTarget as any).collectionID = (await this.formsService.get(mutableTarget.formID)).collectionID
			|| DEFAULT_COLLECTION;
		return mutableTarget as T & { formID: string, collectionID: string };
	}

	async populateDocumentMutably
	<T extends UnpopulatedDocument | SecondaryDocument>
	(document: T, person: Person, accessToken: string): Promise<Populated<T>> {
		const apiUser = await this.apiUsersService.getByAccessToken(accessToken);

		const { systemID } = apiUser;
		if (!systemID) {
			throw new HttpException("No valid systemID could be found for the api user", 422);
		}

		document.sourceID = systemID;

		if (!document.formID) {
			throw new HttpException("Missing required param formID", 422);
		}

		await this.deriveCollectionIDMutably(document);

		const now = new Date().toISOString();
		const dateProps: KeyOf<Pick<Document, "dateEdited" | "dateCreated">>[] = ["dateEdited", "dateCreated"];
		if (person.isImporter()) {
			dateProps.forEach(key => {
				if (!document[key]) {
					document[key] = now;
				}
			});
		} else {
			dateProps.forEach(key => {
				document[key] = now;
			});
			document.creator = person.id;
			document.editor = person.id;
		}
		if (!document.publicityRestrictions) {
			document.publicityRestrictions = "MZ.publicityRestrictionsPublic";
		}
		return document as Populated<T>;
	}

	// TODO logic not yet copied from old api, need to double check:
	// * validation population against existing document; should be implemented in update method
	// * old api does 'linking', id checking etc in `prerareDocument`. Is it handled by store?
	// * thrown errors not formatted with validation error format
	async validate(
		document: Document,
		personToken: string,
		validationErrorFormat?: ValidationErrorFormat
	) {
		const { collectionID } = document;
		const person = await this.personsService.getByToken(personToken);

		await this.formsService.checkAccessIfDisabled(collectionID, person);

		if (!await this.formPermissionsService.hasEditRightsOf(collectionID, personToken)) {
			throw new HttpException("Insufficient rights to use this form", 403);
		}

		await this.documentValidatorService.validate(document, validationErrorFormat);
	}

	private async namedPlaceSideEffects(document: Document & { id: string }, personToken: string) {
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
					place.notes = getDocumentNotes(document);
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
			place.notes = getDocumentNotes(document);
			await this.namedPlacesService.update(place.id, place, personToken);
		}
	}

	private async getCollectionIDs(collectionID: string) {
		const children = (await this.collectionsService.findDescendants(collectionID)).map(c => c.id);
		return [ collectionID, ...children ];
	}

	async checkCanAccessForm(formID: string, personToken: string) {
		const form = await this.formsService.get(formID);
		const { collectionID } = form;

		if (!collectionID) {
			throw new HttpException("Only document owner and editors can view the document", 403);
		}

		if (form.options?.documentsViewableForAll) {
			return true;
		}

		const hasEditRights = await this.formPermissionsService.hasEditRightsOf(collectionID, personToken);
		if (!hasEditRights) {
			// eslint-disable-next-line max-len
			throw new HttpException("You don't have permission to the form and you are not the owner or an editor of the document", 403);
		}
		return true;
	}

}

function getDateCounted(document: Pick<Document, "gatheringEvent" | "gatherings">): Date | undefined {
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
}


const getDocumentNotes = (document: Document) => document.gatheringEvent?.namedPlaceNotes;

const documentHasNewNamedPlaceNote = (document: Document, place: NamedPlace) => {
	const notes = getDocumentNotes(document);
	if (notes && notes !== place.notes) {
		return notes;
	}
};

const dateRangeClause = (dateRange: { from: string, to: string }) => {
	const dateRangeClause = or(dateRangeKeys.reduce((dateQuery, key) =>
		({ ...dateQuery, [key]: `[${dateRange.from} TO ${dateRange.to}]` }),
		{} as Record<DateRangeKey, string>));
	return dateRangeClause;
};
