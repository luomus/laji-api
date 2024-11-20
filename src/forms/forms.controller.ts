import { Get, Post, Body, Param, Delete, Put, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { FormsService } from "./forms.service";
import { AcceptAccessDto, Form, Format, GetPageDto, GetDto, RevokeAccessDto, TransformDto } from "./dto/form.dto";
import { ApiTags } from "@nestjs/swagger";
import { IctAdminGuard } from "src/persons/ict-admin/ict-admin.guard";
import { Lang, QueryWithMaybePersonTokenDto, QueryWithPersonTokenDto } from "src/common.dto";
import { FormPermissionsService } from "./form-permissions/form-permissions.service";
import { createQueryParamsInterceptor } from "src/interceptors/query-params/query-params.interceptor";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { Person } from "src/persons/person.dto";
import { PersonToken } from "src/decorators/person-token.decorator";

@ApiTags("Form")
@LajiApiController("forms")
export class FormsController {

	constructor(
		private readonly formsService: FormsService,
		private readonly formPermissionsService: FormPermissionsService
	) {}

	/** Get form permissions for a person */
	@Get("permissions")
	getPermissions(@Query() _: QueryWithPersonTokenDto, @PersonToken() person: Person) {
		return this.formPermissionsService.getByPerson(person);
	}

	/** Get form permissions for a person, and the form information about whether is has MHL.restrictAccess and MHL.hasAdmins */
	@Get("permissions/:collectionID")
	getPermissionsByCollectionID(
		@Param("collectionID") collectionID: string,
		@Query() _: QueryWithMaybePersonTokenDto,
		@PersonToken({ required : false }) person?: Person
	) {
		return this.formPermissionsService.getByCollectionIDAndPerson(collectionID, person);
	}

	/** Request access to form */
	@Post("permissions/:collectionID")
	requestAccess(
		@Param("collectionID") collectionID: string,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person
	) {
		return this.formPermissionsService.requestAccess(collectionID, person);
	}

	/** Accept access to form */
	@Put("permissions/:collectionID/:personID")
	acceptAccess(
		@Param("collectionID") collectionID: string,
		@Param("personID") personID: string,
		@Query() { type }: AcceptAccessDto,
		@PersonToken() person: Person
	) {
		return this.formPermissionsService.acceptAccess(collectionID, personID, type, person);
	}

	/** Remove access to form */
	@Delete("permissions/:collectionID/:personID")
	revokeAccess(
		@Param("collectionID") collectionID: string,
		@Param("personID") personID: string,
		@Query() _: RevokeAccessDto,
		@PersonToken() person: Person
	) {
		return this.formPermissionsService.revokeAccess(collectionID, personID, person);
	}

	/** Get a page of forms */
	@Get()
	@SwaggerRemoteRef({ source: "store", ref: "form" })
	@UseInterceptors(createQueryParamsInterceptor(GetPageDto))
	getPage(@Query() { lang }: GetPageDto) {
		return this.formsService.getListing(lang);
	}

	/** Get a form by id */
	@Get(":id")
	@SwaggerRemoteRef({ source: "store", ref: "form" })
	getOne(@Param("id") id: string, @Query() { format = Format.schema, lang = Lang.en, expand = true }: GetDto) {
		return this.formsService.get(id, format, lang, expand);
	}

	/** Create a new form */
	@Post()
	@UseGuards(IctAdminGuard)
	@SwaggerRemoteRef({ source: "store", ref: "form" })
	create(@Body() form: Form, @Query() { personToken }: QueryWithPersonTokenDto) {
		return this.formsService.create(form, personToken);
	}

	/** Update an existing form */
	@Put(":id")
	@UseGuards(IctAdminGuard)
	@SwaggerRemoteRef({ source: "store", ref: "form" })
	update(@Param("id") id: string, @Body() form: Form, @Query() { personToken }: QueryWithPersonTokenDto) {
		return this.formsService.update(id, form, personToken);
	}

	/** Delete a form */
	@Delete(":id")
	@UseGuards(IctAdminGuard)
	remove(@Param("id") id: string, @Query() { personToken }: QueryWithPersonTokenDto) {
		return this.formsService.delete(id, personToken);
	}

	/** Get preview of form transformed from json format to schema format */
	@Post("transform")
	@UseGuards(IctAdminGuard)
	@SwaggerRemoteRef({ source: "store", ref: "form" })
	transform(@Body() form: Form, @Query() { personToken, lang = Lang.en }: TransformDto) {
		return this.formsService.transform(form, lang, personToken);
	}
}
