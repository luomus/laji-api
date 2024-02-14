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
import {
	Form, PrepopulatedDocumentFieldFnArea, PrepopulatedDocumentFieldFn, PrepopulatedDocumentFieldFnJoin,
	PrepopulatedDocumentFieldFnTaxon,
	Format
} from "src/forms/dto/form.dto";
import { CACHE_1_H, asArray, parseJSONPointer, updateWithJSONPointer } from "src/utils";
import { TaxaService } from "src/taxa/taxa.service";
import { AreaService } from "src/area/area.service";
import { LangService } from "src/lang/lang.service";
import { MaybeArray } from "src/type-utils";
import { Lang } from "src/common.dto";
import { Taxon } from "src/taxa/taxa.dto";
import { Document } from "@luomus/laji-schema";
import { validateHasOnlyFieldsInForm } from "src/documents/documents.service";

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
		private taxaService: TaxaService,
		private areaService: AreaService,
		private langService: LangService,
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
			this.checkEditingAsPublicAllowed(place, personToken);
		}

		if (!person.isImporter() && !place.owners.includes(person.id)) {
			place.owners.push(person.id);
		}

		const prepopulatedDocument = await this.getAugmentedPrepopulatedDocument(place);
		if (prepopulatedDocument) {
			await this.validatePrepopulatedDocument(prepopulatedDocument, place.collectionID);
			await this.setAcceptedAndPrepopulatedDocumentFor(place, prepopulatedDocument);
		}

		return this.store.create(place);
	}

	private async validatePrepopulatedDocument(prepopulatedDocument: Partial<Document>, collectionID?: string) {
		if (!collectionID) {
			return;
		}
		const strictForm = await this.formsService.findFormByCollectionIDFromHeritanceByRule(collectionID,
			form => !form.options?.strict !== false // Defaults to true.
		);
		if (!strictForm) {
			return;
		}
		const strictFormSchemaFormat = await this.formsService.get(strictForm.id, Format.schema);
		validateHasOnlyFieldsInForm(prepopulatedDocument, strictFormSchemaFormat);
	}

	private async setAcceptedAndPrepopulatedDocumentFor(place: NamedPlace, document: Partial<Document>): Promise<void> {
		const updateAcceptedDocument = place.collectionID
			&& !place.prepopulatedDocument
			&& !place.acceptedDocument
			&& await this.formsService.findFormByCollectionIDFromHeritanceByRule(
				place.collectionID,
				f => !!f.options.namedPlaceOptions?.useAcceptedDocument
			);
		place.prepopulatedDocument = document;
		if (updateAcceptedDocument) {
			place.acceptedDocument = document;
		}
	}

	private async getAugmentedPrepopulatedDocument(place: NamedPlace): Promise<Partial<Document> | undefined> {
		if (!place.collectionID) {
			return place.prepopulatedDocument;
		}

		const form = (await this.formsService.findFormByCollectionIDFromHeritanceByRule(
			place.collectionID,
			form => !!form.options.namedPlaceOptions?.prepopulatedDocumentFields
		)) as HasPrepopDocFields | undefined;

		if (!form) {
			return place.prepopulatedDocument;
		}

		const { prepopulatedDocumentFields } = form.options.namedPlaceOptions;
		const prepopulatedDocument = place.prepopulatedDocument || {};
		const fieldJSONPointers = Object.keys(prepopulatedDocumentFields);

		for (const fieldJSONPointer of fieldJSONPointers) {
			const fnDescriptorOrValuePointer = prepopulatedDocumentFields[fieldJSONPointer];
			let value: unknown;
			if (typeof fnDescriptorOrValuePointer === "string") {
				value = parseJSONPointer(place, fnDescriptorOrValuePointer, { safely: true });
			} else {
				const { fn, ...params } = fnDescriptorOrValuePointer;
				const pointedValue = parseJSONPointer(place, params.from, { safely: true });
				if (pointedValue !== undefined) {
					value = await this.prepopulatedDocumentFieldFns[fn](params, pointedValue);
				}
			}
			if (value !== undefined) {
				updateWithJSONPointer(prepopulatedDocument, fieldJSONPointer, value, { create: true });
			}
		}
		return prepopulatedDocument;
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
		const hasEditRights = hasEditRightsOf(permissions, person);
		if (!hasEditRights) {
			throw new HttpException("You cannot make public named places", 403);
		}
		const forms = await this.formsService.findListedByCollectionID(collectionID);
		const allowedToAddPublic = forms.find(f => f.options.allowAddingPublicNamedPlaces);
		if (!allowedToAddPublic) {
			throw new HttpException("You cannot make public named places", 403);
		}
	}

	private prepopulatedDocumentFieldFns: PrepopulatedDocumentFieldFnMap = {
		join: (
			{ delimiter = ", " },
			pointedValue: MaybeArray<unknown>
		) : string | undefined => {
			return Array.isArray(pointedValue) ? pointedValue.join(delimiter) : undefined;
		},
		taxon: async (
			{ taxonProp = "vernacularName" },
			pointedValue: string
		) : Promise<string | undefined> => {
			const taxon = await this.langService.translate(await this.taxaService.get(pointedValue), Lang.fi);
			const value = taxon[taxonProp as keyof Taxon];
			return value as string;
		},
		area: async (
			{ type = "ML.municipality", key = "name", delimiter = ", " },
			pointedValue: MaybeArray<string>
		): Promise<string | undefined> => {
			const idToArea = await this.areaService.getDictByType(type);
			const municipalityIds = asArray(pointedValue);
			return (await Promise.all(
				municipalityIds.map(id => this.langService.translate(idToArea[id], Lang.fi))
			)).map(m => m[key]).join(delimiter);
		}
	};
}

type PrepopulatedDocumentFieldFnParams<T> =
	T extends "taxon" ? PrepopulatedDocumentFieldFnTaxon :
	T extends "area" ? PrepopulatedDocumentFieldFnArea :
	PrepopulatedDocumentFieldFnJoin;

type PrepopulatedDocumentFieldFnMap = {
	[fnName in PrepopulatedDocumentFieldFn["fn"]]: (
		params: Omit<PrepopulatedDocumentFieldFnParams<fnName>, "fn">, pointedValue: unknown
	) => string | undefined | Promise<string | undefined>
}

type HasPrepopDocFields = {
	options: Form["options"]
		& {
			namedPlaceOptions: NonNullable<Form["options"]["namedPlaceOptions"]> &
			{
				prepopulatedDocumentFields:
					NonNullable<Form["options"]["namedPlaceOptions"]["prepopulatedDocumentFields"]>
			}
		}
}
