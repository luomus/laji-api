import { Get, Post, Body, Param, Delete, Put, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { FormsService } from "./forms.service";
import { Form, Format, GetDto, TransformDto } from "./dto/form.dto";
import { ApiTags } from "@nestjs/swagger";
import { IctAdminGuard } from "src/persons/ict-admin/ict-admin.guard";
import { Lang } from "src/common.dto";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { Person } from "src/persons/person.dto";
import { RequestPerson }from "src/decorators/request-person.decorator";
import { ResultsArray, swaggerResponseAsResultsArray } from "src/interceptors/results-array.interceptor";
import { RequestLang } from "src/decorators/request-lang.decorator";
import { FormParticipantsService } from "./form-participants/form-participants.service";

@ApiTags("Form")
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
	@SwaggerRemoteRef({ source: "store", ref: "/form", customizeResponseSchema: swaggerResponseAsResultsArray })
	@UseInterceptors(ResultsArray)
	getListing(@RequestLang() lang: Lang) {
		return this.formsService.getListing(lang);
	}

	/** Get a form by id */
	@Get(":id")
	@SwaggerRemoteRef({ source: "store", ref: "/form" })
	getOne(@Param("id") id: string, @Query() { format = Format.schema, lang = Lang.en, expand = true }: GetDto) {
		return this.formsService.get(id, format, lang, expand);
	}

	/** Create a new form */
	@Post()
	@UseGuards(IctAdminGuard)
	@SwaggerRemoteRef({ source: "store", ref: "/form" })
	create(@Body() form: Form) {
		return this.formsService.create(form);
	}

	/** Update an existing form */
	@Put(":id")
	@UseGuards(IctAdminGuard)
	@SwaggerRemoteRef({ source: "store", ref: "/form" })
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
	@SwaggerRemoteRef({ source: "store", ref: "/form" })
	transform(@Body() form: Form, @Query() { lang = Lang.en }: TransformDto) {
		return this.formsService.transform(form, lang);
	}
}
