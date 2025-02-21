import { HttpException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { FormSchemaFormat, Format, Hashed } from "src/forms/dto/form.dto";
import { JSONSchema, JSONSchemaArray, JSONSchemaObject } from "src/json-schema.utils";
import { JSONObjectSerializable, isObject } from "src/typing.utils";
import { Populated, ValidationErrorFormat, ValidationStrategy, ValidationType } from "../documents.dto";
import { Document } from "@luomus/laji-schema";
import Ajv from "ajv";
import { FormsService } from "src/forms/forms.service";
import * as lajiValidate from "@luomus/laji-validate";
import { DocumentValidator, ErrorsObj, ValidationException }
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
import { dotNotationToJSONPointer } from "src/utils";
import { Person } from "src/persons/person.dto";
import { ProfileService } from "src/profile/profile.service";
import { FormPermissionsService } from "src/forms/form-permissions/form-permissions.service";
import { CollectionsService } from "src/collections/collections.service";

@Injectable()
export class DocumentValidatorService {

	constructor(
		private formsService: FormsService,
		@Inject(forwardRef(() => NamedPlacesService)) private namedPlacesService: NamedPlacesService,
		private profileService: ProfileService,
		private formPermissionsService: FormPermissionsService,
		private collectionsService: CollectionsService,
		// These following services are used even though TS doesn't know about it. They are called dynamically in
		// `validateWithValidationStrategy()`.
		private taxonBelongsToInformalTaxonGroupValidatorService: TaxonBelongsToInformalTaxonGroupValidatorService,
		private noExistingGatheringsInNamedPlaceValidatorService: NoExistingGatheringsInNamedPlaceValidatorService,
		private namedPlaceNotTooNearOtherPlacesValidatorService: NamedPlaceNotTooNearOtherPlacesValidatorService,
		private uniqueNamedPlaceAlternativeIDsValidatorService: UniqueNamedPlaceAlternativeIDsValidatorService
	) {
		this.extendLajiValidate();
	}

	async validate(document: Populated<Document>, person: Person, type?: ValidationType) {
		if (document.isTemplate) {
			return;
		}

		await this.validateLinkings(document, person);

		const form = await this.formsService.get(document.formID, Format.schema);
		const strict = form.options?.strict !== false;

		if (strict) {
			checkHasOnlyFieldsInForm(document, form);
		}

		await this.validateAgainstSchema(document);

		if (document.publicityRestrictions === "MZ.publicityRestrictionsPrivate") {
			return;
		}

		await this.validateAgainstForm(document, type);
	}

	private async validateAgainstForm(document: Populated<Document>, type = ValidationType.error) {
		const { validators, warnings } = await this.formsService.get(document.formID, Format.schema);
		try {
			await lajiValidate.async(document, type === ValidationType.error ? validators : warnings);
		} catch (e) {
			const errors = Object.keys(e).reduce((jsonPointerErrors, dotNotationKey) => {
				jsonPointerErrors[dotNotationToJSONPointer(dotNotationKey)] = e[dotNotationKey];
				return jsonPointerErrors;
			}, {} as ErrorsObj);
			throw new ValidationException(errors);
		}
	}

	private async validateAgainstSchema(document: Populated<Document>) {
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
			throw new ValidationException(errors);
		}
	}

	private async validateLinkings(document: Populated<Document>, person: Person) {
		await this.validatePersonLinkings(document, person);
		await this.validateNamedPlaceLinking(document);
	}

	private async validatePersonLinkings(document: Populated<Document>, person: Person) {
		const { collectionID, creator } = document;
		if (collectionID && await this.formPermissionsService.isAdminOf(collectionID, person)) {
			return;
		}

		const personValidations = [
			...(document.gatheringEvent?.leg || [])
				.map((leg, i) => ({ personString: leg, path: `/document/gatheringEvent/${i}/leg` })),
			...(document.editors || [])
				.map((editor, i) => ({ personString: editor, path: `/document/editors/${i}` }))
		];

		const { friends } = await this.profileService.getByPersonIdOrCreate(creator);

		for (const { personString, path } of personValidations) {
			if (personString.toUpperCase().startsWith("MA.") && ![creator, ...friends].includes(personString)) {
				throw new ValidationException({ [path]: ["MA codes must be the creator or the creator's friend!"] });
			}
		}
	}

	private async validateNamedPlaceLinking(document: Populated<Document>) {
		if (!document.namedPlaceID) {
			return;
		}

		try {
			const namedPlace = await this.namedPlacesService.get(document.namedPlaceID);
			const form = await this.formsService.get(document.formID);
			if (namedPlace.collectionID && form.collectionID && namedPlace.collectionID !== form.collectionID) {
				const collectionChildren = await this.collectionsService.findDescendants(form.collectionID);
				if (!collectionChildren.find(child => child.id === namedPlace.collectionID)) {
					throw new ValidationException({
						"/namedPlaceID": ["Named place doesn't belong to the forms collection or it's descendants."]
					});
				}
			}
		} catch (e) {
			throw new ValidationException({ "/namedPlaceID": ["Named place not found or not public"] });
		}
	}

	async validateWithValidationStrategy<T = Document>(item: T, options: {
		validator: ValidationStrategy,
		field?: string,
		informalTaxonGroup?: string[],
		validationErrorFormat?: ValidationErrorFormat,
		type?: ValidationType
	}) {
		const  { validator, field, ...validatorOptions } = options;
		return ((this as any)[`${validator}ValidatorService`] as DocumentValidator<T>)
			.validate(item,
				field === undefined ? undefined
					: dotNotationToJSONPointer(field),
				validatorOptions
			);
	}

	private extendLajiValidate() {
		lajiValidate.extend(lajiValidate.validators.remote, {
			fetch: async (
				path: string,
				query: {
					validator: ValidationStrategy,
					validationErrorFormat: ValidationErrorFormat,
					field?: string
				}
				& JSONObjectSerializable,
				request: { body: string }
			) => {
				try {
					await this.validateWithValidationStrategy(JSON.parse(request.body), query);
					return { status: 200 };
				} catch (error) {
					return {
						status: error.status || 500,
						json: () => ({ error: error.response }),
					};
				}
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
			if (!(schema as JSONSchemaObject).properties?.[key]) {
				throw new HttpException(
					"Unprocessable Entity",
					422,
					{ cause: `Property ${key} not in form ${form.id} schema!` }
				);
			}
			if (key === "geometry") { // Don't validate internals of the geometry, as the type is just an empty object.
				return;
			}
			recursively(data[key], (schema as JSONSchemaObject).properties![key]!);
		}); else if (Array.isArray(data)) {
			data.forEach(item => recursively(item, (schema as JSONSchemaArray).items));
		}
	};
	recursively(data, form.schema);
};
