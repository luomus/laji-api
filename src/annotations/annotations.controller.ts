import { Body, Delete, Get, Param, Post, Query, UseInterceptors, Version } from "@nestjs/common";
import { AnnotationsService } from "./annotations.service";
import { GetAnnotationsDto } from "./annotations.dto";
import { RequestPerson }from "src/decorators/request-person.decorator";
import { Person } from "src/persons/person.dto";
import { PaginatedDto } from "src/pagination.dto";
import { SwaggerRemote } from "src/swagger/swagger-remote.decorator";
import { Annotation } from "@luomus/laji-schema/models";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiExcludeEndpoint, ApiTags } from "@nestjs/swagger";
import { Lang } from "src/common.dto";
import { LangService } from "src/lang/lang.service";
import { RequestLang } from "src/decorators/request-lang.decorator";
import { ResultsArray, swaggerResponseAsResultsArray } from "src/interceptors/results-array.interceptor";

@ApiTags("Annotations")
@LajiApiController("annotations")
export class AnnotationsController {

	constructor(private annotationsService: AnnotationsService, private langService: LangService) {}

	/** Fetch all annotation tags */
	@Get("tags")
	@SwaggerRemote({
		source: "store",
		ref: "/tag",
		customizeResponseSchema: swaggerResponseAsResultsArray
	})
	@Version("1")
	@UseInterceptors(ResultsArray)
	async getTags(@RequestLang() lang: Lang) {
		const tags = await this.annotationsService.getTags();
		return tags.map(tag => this.langService.translate(tag, lang));
	}

	// Old way of fetching annotation tags. Nowadays it's wrapped inside "results".
	@Get("tags")
	@ApiExcludeEndpoint()
	async getTagsOld(@RequestLang() lang: Lang) {
		const tags = await this.annotationsService.getTags();
		return tags.map(tag => this.langService.translate(tag, lang));
	}

	/** Get a page of annotations */
	@Get()
	@SwaggerRemote({ source: "store", ref: "/annotation" })
	getPage(
		@Query() { rootID, page, pageSize }: GetAnnotationsDto,
		@RequestPerson() person: Person
	): Promise<PaginatedDto<Annotation>> {
		return this.annotationsService.getPage(
			rootID,
			person,
			page,
			pageSize
		);
	}

	/** Create a new annotation */
	@Post()
	@SwaggerRemote({ source: "store", ref: "/annotation" })
	async create(
		@Body() annotation: Annotation,
		@RequestPerson() person: Person
	): Promise<Annotation> {
		return this.annotationsService.create(annotation, person);
	}

	/** Delete an annotation. It's a soft delete, a succesful delete returns the updated annotation */
	@Delete(":id")
	@SwaggerRemote({ source: "store", ref: "/annotation" })
	async delete(
		@Param("id") id: string,
		@RequestPerson() person: Person
	): Promise<Annotation> {
		return this.annotationsService.delete(id, person);
	}
}
