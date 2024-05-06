import { HttpException, Inject, Injectable } from "@nestjs/common";
import { FormSchemaFormat, JSONSchema, JSONSchemaArray, JSONSchemaObject } from "src/forms/dto/form.dto";
import { Flatten, isObject  } from "src/type-utils";
import { StoreService } from "src/store/store.service";
import { Document } from "./documents.dto";
import { Query, getQueryVocabulary } from "src/store/store-query";
import { FormPermissionsService } from "src/forms/form-permissions/form-permissions.service";
import { PersonsService } from "src/persons/persons.service";
import { FormsService } from "src/forms/forms.service";
import { CollectionsService } from "src/collections/collections.service";
import { Person } from "src/persons/person.dto";
import { storePageAdapter } from "src/pagination";

const observationYearKeys = [
	"gatheringEvent.dateBegin",
	"gatherings.dateBegin",
	"gatherings.units.unitGathering.dateBegin"
] as const;
type ObservationYearKey = typeof observationYearKeys[number];
type DocumentQuery = Document & Record<ObservationYearKey, string>
const { or, and, not, exists } = getQueryVocabulary<DocumentQuery>();

export const AllowedPageQueryKeys = [
	"formID",
	"collectionID",
	"sourceID",
	"isTemplate",
	"namedPlaceID",
] as const;
type AllowedQueryKeys = typeof AllowedPageQueryKeys[number];

const editorOrCreator = (person: Person) => or({ creator: person.id, editors: person.id });

@Injectable()
export class DocumentsService {
	constructor(
		@Inject("STORE_RESOURCE_SERVICE") private store: StoreService<Document>,
		private personsService: PersonsService,
		private formPermissionsService: FormPermissionsService,
		private formsService: FormsService,
		private collectionsService: CollectionsService,
	) {}

	findOne = this.store.findOne.bind(this.store);

	async getPage(
		filters: {[prop in AllowedQueryKeys]: Flatten<Partial<Document[prop]>>},
		personToken: string,
		observationYear?: number,
		page?: number,
		pageSize = 20,
		selectedFields?: (keyof Document)[]
	) {
		const { formID, collectionID, isTemplate } = filters;

		delete filters.isTemplate;
		let storeQuery: Query<DocumentQuery> = and(filters);

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
			if (formID && !permissions.admins.includes(person.id)) {
				storeQuery = and(storeQuery, editorOrCreator(person));
			}
		} else {
			storeQuery = and(storeQuery, editorOrCreator(person));
		}

		if (!isTemplate) {
			storeQuery = and(storeQuery, or({ isTemplate: false }, not({ isTemplate: exists })));
		}
		if (observationYear) {
			const observationYearClause = or(observationYearKeys.reduce((dateQuery, key) =>
				({ ...dateQuery, [key]: `[${observationYear}-01-01 TO ${observationYear}-12-31]` }),
				{} as Record<ObservationYearKey, string>));
			storeQuery = and(storeQuery, observationYearClause);
		}
		return storePageAdapter(await this.store.getPage(storeQuery, page, pageSize, selectedFields));
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

	private async getCollectionIDs(collectionID: string) {
		const children = (await this.collectionsService.findDescendants(collectionID)).map(c => c.id);
		return [ collectionID, ...children ];
	}

	async checkCanAccessForm(formID: string,  personToken: string) {
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

export const checkHasOnlyFieldsInForm = (data: Partial<Document>, form: FormSchemaFormat): void => {
	// Keys not usually listed in form fields but are always valid.
	const metaKeys = [
		"id", "formID", "dateCreated", "dateEdited", "creator", "editor", "type",
		"publicityRestrictions", "sourceID", "collectionID", "@type", "locked",
		"namedPlaceID", "@context", "legUserID", "additionalIDs", "secureLevel",
		"keywords", "coordinateSource", "dataOrigin", "caption", "namedPlaceNotes"
	];
	const recursively = (data: unknown, schema: JSONSchema) => {
		if (isObject(data)) Object.keys(data).forEach(key => {
			if (metaKeys.some(k => key === k)) {
				return;
			}
			if (!(schema as JSONSchemaObject).properties[key]) {
				throw new HttpException(
					"Unprocessable Entity",
					422,
					{ cause: `Property ${key} not in form ${form.id} schema!` }
				);
			}
			if (key === "geometry") { // Don't validate internals of the geometry, as the type is just an empty object.
				return;
			}
			recursively(data[key], (schema as JSONSchemaObject).properties[key]!);
		}); else if (Array.isArray(data)) {
			data.forEach(item => recursively(item, (schema as JSONSchemaArray).items));
		}
	};
	recursively(data, form.schema);
};
