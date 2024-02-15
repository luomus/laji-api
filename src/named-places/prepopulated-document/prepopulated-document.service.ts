import { Injectable } from "@nestjs/common";
import { validateHasOnlyFieldsInForm } from "src/documents/documents.service";
import { Form, Format, PrepopulatedDocumentFieldFn, PrepopulatedDocumentFieldFnArea, PrepopulatedDocumentFieldFnJoin,
	PrepopulatedDocumentFieldFnTaxon } from "src/forms/dto/form.dto";
import { FormsService } from "src/forms/forms.service";
import { Document } from "@luomus/laji-schema";
import { NamedPlace } from "../named-places.dto";
import { MaybeArray } from "src/type-utils";
import { LangService } from "src/lang/lang.service";
import { asArray, parseJSONPointer, updateWithJSONPointer } from "src/utils";
import { TaxaService } from "src/taxa/taxa.service";
import { Lang } from "src/common.dto";
import { Taxon } from "src/taxa/taxa.dto";
import { AreaService } from "src/area/area.service";

@Injectable()
export class PrepopulatedDocumentService {

	constructor(
		private formsService: FormsService,
		private langService: LangService,
		private taxaService: TaxaService,
		private areaService: AreaService
	) { }


	async augment(place: NamedPlace) {
		const prepopulatedDocument = await this.getAugmentedFor(place);
		if (prepopulatedDocument) {
			await this.validate(prepopulatedDocument, place.collectionID);
			await this.assignFor(place, prepopulatedDocument);
		}
	}

	private async validate(prepopulatedDocument: Partial<Document>, collectionID?: string) {
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

	private async assignFor(place: NamedPlace, document: Partial<Document>): Promise<void> {
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

	private async getAugmentedFor(place: NamedPlace): Promise<Partial<Document> | undefined> {
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
