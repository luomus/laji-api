import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { FormsService } from './forms.service';
import { Form } from './dto/form.dto';
import {ApiTags} from '@nestjs/swagger';

@ApiTags('forms')
@Controller('forms')
export class FormsController {
	constructor(private readonly formsService: FormsService) {}

	/* 
	 * Create a new form
	 */
	@Post()
	create(@Body() form: Form) {
		return this.formsService.create(form);
	}

	/*
	 * Get all forms
	 */
	@Get()
	findAll() {
		return this.formsService.findAll();
	}

	/*
	 * Get a form by id
	 */
	@Get(":id")
	findOne(@Param("id") id: string) {
		return this.formsService.findOne(id);
	}

	/*
	 * Update an existing form
	 */
	@Put(":id")
	update(@Param("id") id: string, @Body() form: Form) {
		return this.formsService.update(id, form);
	}

	/*
	 * Delete a form
	 */
	@Delete(":id")
	remove(@Param("id") id: string) {
		return this.formsService.remove(id);
	}

	/*
	 * Delete a form
	 */
	@Post(":id")
	transform(@Body() form: Form) {
		return this.formsService.transform(form);
	}
}
