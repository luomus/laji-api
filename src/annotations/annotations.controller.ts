import { Body, Delete, Get, Param, Post, Query, UseInterceptors } from "@nestjs/common";
import { AnnotationsService } from "./annotations.service";
import { CreateAnnotationDto, GetAnnotationsDto } from "./annotations.dto";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";
import { PaginatedDto } from "src/pagination";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { Annotation, Tag } from "@luomus/laji-schema/models";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";
import { LangQueryDto, QueryWithPersonTokenDto } from "src/common.dto";
import { createQueryParamsInterceptor } from "src/interceptors/query-params/query-params.interceptor";
import { ApiUser } from "src/decorators/api-user.decorator";
import { ApiUserEntity } from "src/api-users/api-user.entity";

@ApiTags("Annotations")
@LajiApiController("annotations")
export class AnnotationsController {

	constructor(private annotationsService: AnnotationsService) {}

	// TODO what does "only visible in dev mode" in the comment mean? It's copied from the old API.
	/** Fetch all annotation tags (Only visible in dev mode) */
	@Get("tags")
	@UseInterceptors(createQueryParamsInterceptor(LangQueryDto))
	@SwaggerRemoteRef({ source: "store", ref: "tag" })
	getTags(
		@Query() _: LangQueryDto,
	): Promise<Tag[]> {
		return this.annotationsService.getTags();
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
		@PersonToken({ required: false }) person: Person,
		@ApiUser() apiUser: ApiUserEntity
	): Promise<Annotation> {
		return this.annotationsService.create(annotation, person, apiUser);
	}

	/** Delete an annotation */
	@Delete(":id")
	@SwaggerRemoteRef({ source: "store", ref: "annotation" })
	async delete(
		@Param("id") id: string,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person
	): Promise<Annotation> {
		return this.annotationsService.delete(id, person);
	}
}
