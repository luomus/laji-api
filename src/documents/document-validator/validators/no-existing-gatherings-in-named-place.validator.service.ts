import { DocumentsService } from "src/documents/documents.service";
import { Document } from "@luomus/laji-schema";
import { FormSchemaFormat, Format } from "src/forms/dto/form.dto";
import { isValidDate } from "src/utils";
import { HttpException, Injectable } from "@nestjs/common";
import { DocumentValidator, ValidationException, joinJSONPointers } from "../document-validator.utils";
import { FormsService } from "src/forms/forms.service";

@Injectable()
export class NoExistingGatheringsInNamedPlaceValidatorService implements DocumentValidator {

	constructor(
		private documentsService: DocumentsService,
		private formsService: FormsService
	) {}

	async validate(document: Document, path = "/gatheringEvent/dateBegin") {

		const { formID, namedPlaceID } = document;
		if (!formID) {
			throw new ValidationException(
				{ "/formID": ["Missing formID"] }
			);
		}
		if (!namedPlaceID) {
			throw new ValidationException(
				{ "/namedPlaceID": ["Could not find the named place in the document"] }
			);
		}
		const form = await this.formsService.get(formID, Format.schema);
		const dateRange = this.getPeriod(form, document, path);

		const namedPlaceHasDocuments =
			await this.documentsService.existsByNamedPlaceID(namedPlaceID, dateRange);

		if (!namedPlaceHasDocuments) {
			return;
		}

		const { id } = document;
		const isNewDoc = !id;
		if (isNewDoc) {
			throw new ValidationException(
				{ [path]: ["Observation already exists within the given gathering period."] }
			);
		} else {
			const namedPlaceHasDocumentsForExistingDoc =
				await this.documentsService.existsByNamedPlaceID(namedPlaceID, dateRange, id);
			if (!namedPlaceHasDocumentsForExistingDoc) {
				throw new ValidationException(
					{ [path]: ["Observation already exists within the given gathering period."] }
				);
			}
		}
	}

	getPeriod(form: FormSchemaFormat, document: Document, path?: string) {
		const errorPath = joinJSONPointers(path, "/gatheringEvent/dateBegin");
		if (!document.gatheringEvent || !document.gatheringEvent.dateBegin) {
			throw new ValidationException({ [errorPath]: ["Date is required"] });
		}
		const start =  new Date(document.gatheringEvent.dateBegin);
		if (!isValidDate(start)) {
			throw new ValidationException(
				{ "/namedPlaceID": ["Could not find the named place in the document"] }
			);
		}

		const periods = form.options?.periods;

		const comp = ((start.getMonth() + 1) * 100) + start.getDate();

		if (!periods) {
			const end = new Date(document.gatheringEvent.dateEnd as string); // TS is wrong, Date accepts undefined.
			if (!isValidDate(end)) {
				return { from: start.toISOString(), to: start.toISOString() };
			}
			return { from: start.toISOString(), to: end.toISOString() };
		}

		for (const period of periods.slice().sort()) {
			const ranges = period.split("/");
			if (ranges.length !== 2) {
				throw new HttpException(
					"Unprocessable Entity",
					422,
					{ [errorPath]: ["Form had a badly formatted period. Should be in format MM-DD/MM-DD"] }
				);
			}
			const periodStart = +ranges[0]!.replace(/\D/g, "");
			const periodEnd = +ranges[1]!.replace(/\D/g, "");
			if (periodEnd < periodStart) {
				if (periodStart <= comp) {
					return {
						from: start.getFullYear() + "-" + ranges[0],
						to: (start.getFullYear() + 1) + "-" + ranges[1]
					};
				}
				else if (periodEnd >= comp) {
					return {
						from: (start.getFullYear() - 1) + "-" + ranges[0],
						to: start.getFullYear() + "-" + ranges[1]
					};
				}
			}
			else if (periodStart <= comp && periodEnd >= comp) {
				return {
					from: start.getFullYear() + "-" + ranges[0],
					to: start.getFullYear() + "-" + ranges[1]
				};
			}
		}
	}
}
