import { Body, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { AnnotationsService } from "./annotations.service";
import { CreateAnnotationDto, GetAnnotationsDto } from "./annotations.dto";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";
import { PaginatedDto } from "src/pagination.utils";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { Annotation } from "@luomus/laji-schema/models";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";
import { QueryWithLangDto, QueryWithPersonTokenDto } from "src/common.dto";
import { LangService } from "src/lang/lang.service";

@ApiTags("Annotations")
@LajiApiController("annotations")
export class AnnotationsController {

	constructor(private annotationsService: AnnotationsService, private langService: LangService) {}

	/** Fetch all annotation tags */
	@Get("tags")
	@SwaggerRemoteRef({
		source: "store",
		ref: "tag",
		customizeResponseSchema: schema => ({ type: "array", items: schema })
	})
	async getTags(@Query() { lang }: QueryWithLangDto) {
		const tags = await this.annotationsService.getTags();
		return tags.map(tag => this.langService.translate(tag, lang));
	}

	/** Get a page of annotations */
	@Get()
	@SwaggerRemoteRef({ source: "store", ref: "annotation" })
	getPage(
		@Query() { rootID, page, pageSize }: GetAnnotationsDto,
		@PersonToken() person: Person
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
	@SwaggerRemoteRef({ source: "store", ref: "annotation" })
	async create(
		@Body() annotation: Annotation,
		@Query() _: CreateAnnotationDto,
		@PersonToken() person: Person
	): Promise<Annotation> {
		return this.annotationsService.create(annotation, person);
	}

	/** Delete an annotation */
	@Delete(":id")
	async delete(
		@Param("id") id: string,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person
	): Promise<Annotation> {
		return this.annotationsService.delete(id, person);
	}
}
