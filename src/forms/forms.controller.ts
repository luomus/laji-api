import { Controller, Get, Post, Body, Param, Delete, Put, Query } from '@nestjs/common';
import { FormsService } from './forms.service';
import { Form, Format, GetAllDto, GetDto, Lang, QueryWithPersonTokenDto } from './dto/form.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags("forms")
@Controller("forms")
export class FormsController {
	constructor(private readonly formsService: FormsService) {}

	/* 
	 * Create a new form
	 */
	@Post()
	create(@Body() form: Form, @Query() {personToken}: QueryWithPersonTokenDto) {
		return this.formsService.create(form, personToken);
	}

	/*
	 * Get all forms
	 */
	@Get()
	findAll(@Query() {lang = Lang.en, page, pageSize}: GetAllDto) {
		return this.formsService.findAll(lang, page, pageSize);
	}

	/*
	 * Get a form by id
	 */
	@Get(":id")
	findOne(@Param("id") id: string, @Query() {format = Format.schema, lang = Lang.en, expand = true}: GetDto) {
		return this.formsService.findOne(id, format, lang, expand);
	}

	/*
	 * Update an existing form
	 */
	@Put(":id")
	update(@Param("id") id: string, @Body() form: Form, @Query() {personToken}: QueryWithPersonTokenDto) {
		return this.formsService.update(id, form, personToken);
	}

	/*
	 * Delete a form
	 */
	@Delete(":id")
	remove(@Param("id") id: string, @Query() {personToken}: QueryWithPersonTokenDto) {
		return this.formsService.remove(id, personToken);
	}

	/*
	 * Delete a form
	 */
	@Post(":id")
	transform(@Body() form: Form, @Query() {personToken}: QueryWithPersonTokenDto) {
		return this.formsService.transform(form, personToken);
	}
}
