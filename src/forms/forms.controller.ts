import { Controller, Get, Post, Body, Param, Delete, Put, Query, UseGuards } from "@nestjs/common";
import { FormsService } from "./forms.service";
import { Form, Format, GetAllDto, GetDto, Lang } from "./dto/form.dto";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { IctAdminGuard } from "src/persons/ict-admin/ict-admin.guard";
import { QueryWithPersonTokenDto } from "src/common.dto";

@ApiSecurity("access_token")
@ApiTags("forms")
@Controller("forms")
export class FormsController {
	constructor(private readonly formsService: FormsService) {}

	/*
	 * Get all forms
	 */
	@Get()
	findAll(@Query() { lang = Lang.en, page, pageSize }: GetAllDto) {
		return this.formsService.getPage(lang, page, pageSize);
	}

	/*
	 * Get a form by id
	 */
	@Get(":id")
	findOne(@Param("id") id: string, @Query() { format = Format.schema, lang = Lang.en, expand = true }: GetDto) {
		return this.formsService.findOne(id, format, lang, expand);
	}

	/* 
	 * Create a new form
	 */
	@Post()
	@UseGuards(IctAdminGuard)
	create(@Body() form: Form, @Query() { personToken }: QueryWithPersonTokenDto) {
		return this.formsService.create(form, personToken);
	}

	/*
	 * Update an existing form
	 */
	@Put(":id")
	@UseGuards(IctAdminGuard)
	update(@Param("id") id: string, @Body() form: Form, @Query() { personToken }: QueryWithPersonTokenDto) {
		return this.formsService.update(id, form, personToken);
	}

	/*
	 * Delete a form
	 */
	@Delete(":id")
	@UseGuards(IctAdminGuard)
	remove(@Param("id") id: string, @Query() { personToken }: QueryWithPersonTokenDto) {
		return this.formsService.remove(id, personToken);
	}

	/*
	 * Get preview of form transformed from json format to schema format
	 */
	@Post("transform")
	@UseGuards(IctAdminGuard)
	transform(@Body() form: Form, @Query() { personToken }: QueryWithPersonTokenDto) {
		return this.formsService.transform(form, personToken);
	}
}
