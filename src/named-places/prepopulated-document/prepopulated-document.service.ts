import { Injectable } from "@nestjs/common";
import { checkHasOnlyFieldsInForm } from "src/documents/document-validator/document-validator.service";
import { Form, Format, PrepopulatedDocumentFieldFn, PrepopulatedDocumentFieldFnArea, PrepopulatedDocumentFieldFnJoin,
	PrepopulatedDocumentFieldFnTaxon } from "src/forms/dto/form.dto";
import { FormsService } from "src/forms/forms.service";
import { Document } from "@luomus/laji-schema";
import { MaybeArray } from "src/typing.utils";
import { LangService, translateMaybeMultiLang } from "src/lang/lang.service";
import { asArray, parseJSONPointer, updateWithJSONPointer } from "src/utils";
import { TaxaService } from "src/taxa/taxa.service";
import { Lang } from "src/common.dto";
import { Taxon } from "src/taxa/taxa.dto";
import { AreaService } from "src/area/area.service";
import { NamedPlace } from "../named-places.dto";

@Injectable()
export class PrepopulatedDocumentService {

	constructor(
		private formsService: FormsService,
		private langService: LangService,
		private taxaService: TaxaService,
		private areaService: AreaService
	) { }

	async getAugmented(place: NamedPlace): Promise<NamedPlace> {
		const prepopulatedDocument = await this.getAugmentedFor(place);
		if (prepopulatedDocument) {
			await this.validate(prepopulatedDocument, place.collectionID);
			return this.getAssigned(place, prepopulatedDocument);
		}
		return place;
	}

	private async validate(prepopulatedDocument: Document, collectionID?: string) {
		if (!collectionID) {
			return;
		}
		const strictForm = await this.formsService.findFor(collectionID,
			form => form.options?.strict !== false
		);
		if (!strictForm) {
			return;
		}
		const strictFormSchemaFormat = await this.formsService.get(strictForm.id, Format.schema);
		checkHasOnlyFieldsInForm(prepopulatedDocument, strictFormSchemaFormat);
	}

	/** Assigns prepopulated document and accepted document to the place according to form options */
	async getAssigned(place: NamedPlace, document: Document): Promise<NamedPlace> {
		const updateAcceptedDocument = place.collectionID
			&& !place.prepopulatedDocument
			&& !place.acceptedDocument
			&& await this.formsService.findFor(
				place.collectionID,
				f => f.options.namedPlaceOptions?.useAcceptedDocument
			);
		place = { ...place, prepopulatedDocument: document };
		if (updateAcceptedDocument) {
			place = { ...place, acceptedDocument: document };
		}
		return place;
	}

	private async getAugmentedFor(place: NamedPlace): Promise<Document | undefined> {
		if (!place.collectionID) {
			return place.prepopulatedDocument;
		}

		const form = (await this.formsService.findFor(
			place.collectionID,
			form => form.options.namedPlaceOptions?.prepopulatedDocumentFields
		)) as HasPrepopDocFields | undefined;

		if (!form) {
			return place.prepopulatedDocument;
		}

		const { prepopulatedDocumentFields } = form.options.namedPlaceOptions;
		const prepopulatedDocument: Document = place.prepopulatedDocument || { gatherings: [{}] };
		const fieldJSONPointers = Object.keys(prepopulatedDocumentFields);

		for (const fieldJSONPointer of fieldJSONPointers) {
			const fnDescriptorOrValuePointer = prepopulatedDocumentFields[fieldJSONPointer]!;
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
			const taxon = await this.taxaService.get(pointedValue);
			const value = translateMaybeMultiLang(taxon[taxonProp as keyof Taxon], Lang.fi);
			if (value instanceof Array) {
				throw new Error("Can't resolve into an array value");
			}
			return value;
		},
		area: async (
			{ type = "ML.municipality", key = "name", delimiter = ", " },
			pointedValue: MaybeArray<string>
		): Promise<string | undefined> => {
			const idToArea = await this.areaService.getDictByType(type);
			const municipalityIds = asArray(pointedValue);
			return (await Promise.all(
				municipalityIds.map(id => this.langService.translate(idToArea[id]!, Lang.fi))
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
			namedPlaceOptions: NonNullable<NonNullable<Form["options"]>["namedPlaceOptions"]> &
			{
				prepopulatedDocumentFields:
					NonNullable<
						NonNullable<NonNullable<Form["options"]>["namedPlaceOptions"]
					>["prepopulatedDocumentFields"]>
			}
		}
}
