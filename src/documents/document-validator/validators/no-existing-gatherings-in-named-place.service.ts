import { DocumentsService } from "src/documents/documents.service";
import { Document } from "src/documents/documents.dto";
import { FormSchemaFormat } from "src/forms/dto/form.dto";
import { dateToISODate, isValidDate } from "src/utils";
import { HttpException, Injectable } from "@nestjs/common";
import { DocumentValidator, ValidationException, getPath } from "../document-validator.utils";

@Injectable()
export class NoExistingGatheringsInNamedPlaceService implements DocumentValidator {

	constructor(private documentsService: DocumentsService) {}

	async validate(document: Document, form: FormSchemaFormat, path?: string) {
		const errorPath = getPath(path, ".gatheringEvent.dateBegin");

		const { namedPlaceID } = document;
		if (!namedPlaceID) {
			throw new HttpException(
				"Unprocessable Entity",
				422,
				{ cause: { ".namedPlaceID": ["Could not find the named place in the document"] } }
			);
		}
		const dateRange = this.getPeriod(form, document, path);
		if (dateRange === false) {
			throw new HttpException(
				"Unprocessable Entity",
				422,
				{ [errorPath]: ["Date is not in correct format. Should use format YYYY-MM-DD."] }
			);
		}

		const namedPlaceHasDocuments =
			await this.documentsService.existsByNamedPlaceID(namedPlaceID, dateRange);

		if (!namedPlaceHasDocuments) {
			return;
		}

		const { id } = document;
		const isNewDoc = !id;
		if (isNewDoc) {
			throw new HttpException(
				"Unprocessable Entity",
				422,
				{ [errorPath]: ["Observation already exists withing the given gathering period."] }
			);
		} else {
			const namedPlaceHasDocumentsForExistingDoc =
				await this.documentsService.existsByNamedPlaceID(namedPlaceID, dateRange, id);
			if (!namedPlaceHasDocumentsForExistingDoc) {
				throw new HttpException(
					"Unprocessable Entity",
					422,
					{ [errorPath]: ["Observation already exists withing the given gathering period."] }
				);
			}
		}
	}

	getPeriod(form: FormSchemaFormat, document: Document, path?: string) {
		const errorPath = getPath(path, ".gatheringEvent.dateBegin");
		if (!document.gatheringEvent || !document.gatheringEvent.dateBegin) {
			throw new ValidationException({ [errorPath]: ["Date is required"] });
		}
		const start =  new Date(document.gatheringEvent.dateBegin);
		if (!isValidDate(start)) {
			return false;
		}

		const periods = form.options?.periods;

		if (!Array.isArray(periods)) {
			const end = new Date(document.gatheringEvent.dateEnd as string); // TS is wrong, Date accepts undefined.
			if (!isValidDate(end)) {
				return { from: dateToISODate(start), to: dateToISODate(start) };
			}
			return { from: dateToISODate(start), to: dateToISODate(end) };
		}

		const comp = ((start.getMonth() + 1) * 100) + start.getDate();

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
		throw new HttpException("Unprocessable Entity", 422, { [errorPath]: ["Couldn't interpret period"] });
	}
}
