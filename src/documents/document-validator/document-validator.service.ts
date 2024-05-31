import { HttpException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { FormSchemaFormat, Format, Hashed, JSONSchema, JSONSchemaArray, JSONSchemaObject }
	from "src/forms/dto/form.dto";
import { JSONObjectSerializable, isObject } from "src/type-utils";
import { Populated, ValidationErrorFormat, ValidationStrategy, ValidationType } from "../documents.dto";
import { Document } from "@luomus/laji-schema";
import Ajv from "ajv";
import { FormsService } from "src/forms/forms.service";
import * as lajiValidate from "@luomus/laji-validate";
import { DocumentValidator, ValidationException, formatErrorDetails, isValidationException }
	from "./document-validator.utils";
import { TaxonBelongsToInformalTaxonGroupValidatorService }
	from "./validators/taxon-belongs-to-informal-taxon-group.validator.service";
import { NoExistingGatheringsInNamedPlaceValidatorService }
	from "./validators/no-existing-gatherings-in-named-place.validator.service";
import { NamedPlacesService } from "src/named-places/named-places.service";
import { NamedPlaceNotTooNearOtherPlacesValidatorService }
	from "./validators/named-place-not-too-near-other-places.validator.service";
import { UniqueNamedPlaceAlternativeIDsValidatorService }
	from "./validators/unique-named-place-alternativeIDs.validator.service";

@Injectable()
export class DocumentValidatorService {

	constructor(
		private formsService: FormsService,
		@Inject(forwardRef(() => NamedPlacesService)) private namedPlacesService: NamedPlacesService,
		// These following services are used even though TS doesn't know about it. They are called dynamically in
		// `validateWithValidationStrategy()`.
		private taxonBelongsToInformalTaxonGroupValidatorService: TaxonBelongsToInformalTaxonGroupValidatorService,
		private noExistingGatheringsInNamedPlaceValidatorService: NoExistingGatheringsInNamedPlaceValidatorService,
		private namedPlaceNotTooNearOtherPlacesValidatorService: NamedPlaceNotTooNearOtherPlacesValidatorService,
		private uniqueNamedPlaceAlternativeIDsValidatorService: UniqueNamedPlaceAlternativeIDsValidatorService
	) {
		this.extendLajiValidate();
	}

	async validate(
		document: Populated<Document>,
		validationErrorFormat: ValidationErrorFormat = ValidationErrorFormat.remote
	) {
		if (document.isTemplate) {
			return;
		}

		await this.validateLinkings(document);

		const form = await this.formsService.get(document.formID, Format.schema);
		const strict = form.options?.strict !== false;

		if (strict) {
			checkHasOnlyFieldsInForm(document, form);
		}

		await this.validateAgainstSchema(document, validationErrorFormat);

		if (document.publicityRestrictions === "MZ.publicityRestrictionsPrivate") {
			return;
		}

		await this.validateAgainstForm(document, validationErrorFormat);
	}

	private async validateAgainstForm(
		document: Populated<Document>,
		validationErrorFormat: ValidationErrorFormat = ValidationErrorFormat.remote
	) {
		const { validators } = await this.formsService.get(document.formID, Format.schema);
		try {
			await lajiValidate.async(document, validators);
		} catch (e) {
			const errors = Object.keys(e).reduce((errors, key) => {
				if (Array.isArray(e[key])) {
					if (typeof e[key][0] === "string") {
						const path1 = key.startsWith(".") ? key : "." + key;
						if (!errors[path1]) {
							errors[path1] = [];
						}
						errors[path1]!.push(...e[key]);
					} else if (typeof e[key][0] === "object") {
						e[key].map((obj: Record<string, string | string[]>) => {
							Object.keys(obj).map((path) => {
								const path1 = path.startsWith(".") ? path : "." + path;
								if (!errors[path1]) {
									errors[path1] = [];
								}
								errors[path1]!.push(...obj[path]!);
							});
						});
					} else {
						console.error("Could not interpret the error message");
					}
				}
				return errors;
			}, {} as Record<string, string[]>);
			throw new ValidationException(formatErrorDetails(errors, validationErrorFormat));
		}
	}

	private async validateAgainstSchema(
		document: Populated<Document>,
		validationErrorFormat: ValidationErrorFormat = ValidationErrorFormat.remote
	) {
		const form = await this.formsService.get(document.formID, Format.schema);
		const validator = getAjvValidator(form);
		if (!validator(document)) {
			const errors: Record<string, string[]> = {};
			validator.errors!.map(error => {
				let message = error.message;
				if (error.keyword === "enum" && error.params && error.params.allowedValues) {
					message += ` '${error.params.allowedValues.join("', '")}.`;
				}
				if (!errors[error.instancePath]) {
					errors[error.instancePath] = [];
				}
				errors[error.instancePath]!.push(message ?? "");
			});
			throw new ValidationException(formatErrorDetails(errors, validationErrorFormat));
		}
	}

	private async validateLinkings(document: Document) {
		if (document.namedPlaceID) {
			try {
				await this.namedPlacesService.get(document.namedPlaceID);
			} catch (e) {
				throw new HttpException("Named place not found or not public", 422);
			}
		}
	}

	async validateWithValidationStrategy<T = Document>(item: T, options: {
		validator: ValidationStrategy,
		field?: string,
		informalTaxonGroup?: string[],
		validationErrorFormat?: ValidationErrorFormat,
		type?: ValidationType
	}) {
		const  { validator,
			validationErrorFormat = ValidationErrorFormat.object,
			field,
			...validatorOptions
		} = options;
		try {
			await ((this as any)[`${validator}ValidatorService`] as DocumentValidator<T>)
				.validate(item, field, validatorOptions);
		} catch (e) {
			if (isValidationException(e)) {
				throw new ValidationException(formatErrorDetails(e.getDetails(), validationErrorFormat));
			}
			throw e;
		}
	}

	private extendLajiValidate() {
		lajiValidate.extend(lajiValidate.validators.remote, {
			fetch: async (
				path: string,
				options: {
					body: Document,
					validator: ValidationStrategy,
					validationErrorFormat: ValidationErrorFormat,
					field?: string
				}
				& JSONObjectSerializable,
				request: { body: string }
			) => {
				return this.validateWithValidationStrategy(options.body, options);
			}
		});
	}
}

const ajv = new Ajv({ allErrors: true });

const getAjvValidator = (form: Hashed<FormSchemaFormat>) =>
	ajv.getSchema(form.$id) || ajv.compile(form.schema);

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
