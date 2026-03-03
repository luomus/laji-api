import { Get, Post, Body, Param, Delete, Put, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { FormsService } from "./forms.service";
import { FORM_LISTING_KEYS, Form, Format, GetDto } from "./dto/form.dto";
import { ApiTags } from "@nestjs/swagger";
import { IctAdminGuard } from "src/persons/ict-admin/ict-admin.guard";
import { Lang } from "src/common.dto";
import { SwaggerRemote } from "src/swagger/swagger-remote.decorator";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { Person } from "src/persons/person.dto";
import { RequestPerson }from "src/decorators/request-person.decorator";
import { ResultsArray, swaggerResponseAsResultsArray } from "src/interceptors/results-array.interceptor";
import { RequestLang } from "src/decorators/request-lang.decorator";
import { FormParticipantsService } from "./form-participants/form-participants.service";
import { OpenAPIObject, ReferenceObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { asTuple, parseURIFragmentIdentifierRepresentation, pipe } from "src/utils";
import { pick } from "src/typing.utils";

const inSchemaFormat = (schemaRef: ReferenceObject, document: OpenAPIObject) => {
	const schema: SchemaObject = parseURIFragmentIdentifierRepresentation(document, schemaRef.$ref);
	schema.properties!.schema = {
		$ref: "#/components/schemas/JSONSchema"
	};
	schema.properties!.excludeFromCopy = { type: "array", items: { type: "string" } };
	delete schema.properties!.fields;

	document.components!.schemas = {
		...document.components?.schemas,
		JSONSchema: {
			oneOf: [
				{ $ref: "#/components/schemas/JSONSchemaObject" },
				{ $ref: "#/components/schemas/JSONSchemaArray" },
				{ $ref: "#/components/schemas/JSONSchemaPrimitive" }
			]
		},
		JSONSchemaObject: {
			type: "object",
			properties: {
				type: { enum: [ "object" ] },
				properties: { type: "object", additionalProperties: { "$ref": "#/components/schemas/JSONSchema" } },
				default: { type: "object" }
			}
		},
		JSONSchemaArray: {
			type: "object",
			properties: {
				type: { enum: ["array"] },
				items: {
					$ref: "#/components/schemas/JSONSchema"
				},
				uniqueItems: { type: "boolean" },
				maxItems: { type: "boolean" },
				minItems: { type: "boolean" },
				default: { type: "array" },
			},
			required: ["type", "items"],
			additionalProperties: true
		},
		JSONSchemaPrimitive: {
			type: "object",
			properties: {
				type: {
					enum: ["string", "number", "integer", "boolean", "null"]
				},
				default: {}
			},
			additionalProperties: true
		}
	};
	return schema;
};

const pickFormListingKeys = ([schemaRef, document]: [ReferenceObject, OpenAPIObject]) => {
	const schema: SchemaObject = parseURIFragmentIdentifierRepresentation(document, schemaRef.$ref);
	schema.properties = pick(schema.properties!, ...FORM_LISTING_KEYS);
	return schemaRef;
};

@ApiTags("Forms")
@LajiApiController("forms")
export class FormsController {

	constructor(
		private readonly formsService: FormsService,
		private readonly formParticipantsService: FormParticipantsService
	) {}

	/** Get participants of a form. Only for form admins. */
	@Get(":id/participants")
	getParticipants(@Param("id") id: string, @RequestPerson() person: Person) {
		return this.formParticipantsService.getParticipants(id, person);
	}

	/** Get a page of forms */
	@Get()
	@SwaggerRemote({
		source: "store",
		ref: "/form",
		swaggerSchemaDefinitionName: "FormListing" ,
		customizeResponseSchema: (schema, document) => pipe(
			pickFormListingKeys,
			swaggerResponseAsResultsArray,
		)(asTuple(schema as ReferenceObject, document))
	})
	@UseInterceptors(ResultsArray)
	getListing(@RequestLang() lang: Lang) {
		return this.formsService.getListing(lang);
	}

	/** Get a form by id */
	@Get(":id")
	@SwaggerRemote({
		source: "store",
		ref: "/form",
		swaggerSchemaDefinitionName: "Form",
		customizeResponseSchema: inSchemaFormat
	})
	getOne(
		@Param("id") id: string,
		@Query() { format = Format.schema, expand = true }: GetDto,
		@RequestLang() lang: Lang
	) {
		return this.formsService.get(id, format, lang, expand);
	}

	/** Create a new form */
	@Post()
	@UseGuards(IctAdminGuard)
	@SwaggerRemote({ source: "store", ref: "/form" })
	create(@Body() form: Form) {
		return this.formsService.create(form);
	}

	/** Update an existing form */
	@Put(":id")
	@UseGuards(IctAdminGuard)
	@SwaggerRemote({ source: "store", ref: "/form" })
	update(@Param("id") id: string, @Body() form: Form) {
		return this.formsService.update(id, form);
	}

	/** Delete a form */
	@Delete(":id")
	@UseGuards(IctAdminGuard)
	remove(@Param("id") id: string) {
		return this.formsService.delete(id);
	}

	/** Get preview of form transformed from json format to schema format */
	@Post("transform")
	@UseGuards(IctAdminGuard)
	@SwaggerRemote({ source: "store", ref: "/form" })
	transform(@Body() form: Form, @RequestLang() lang: Lang) {
		return this.formsService.transform(form, lang);
	}
}
