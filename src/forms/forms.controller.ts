import { Get, Post, Body, Param, Delete, Put, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { FormsService } from "./forms.service";
import { AcceptAccessDto, Form, Format, GetAllDto, GetDto, RevokeAccessDto, TransformDto } from "./dto/form.dto";
import { ApiTags } from "@nestjs/swagger";
import { IctAdminGuard } from "src/persons/ict-admin/ict-admin.guard";
import { Lang, QueryWithPersonTokenDto } from "src/common.dto";
import { FormPermissionsService } from "./form-permissions/form-permissions.service";
import { createQueryParamsInterceptor } from "src/interceptors/query-params/query-params.interceptor";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { LajiApiController } from "src/decorators/laji-api-controller";

@ApiTags("Form")
@LajiApiController("forms")
export class FormsController {
	constructor(
		private readonly formsService: FormsService,
		private readonly formPermissionsService: FormPermissionsService
	) {}

	/** Get form permissions for a person */
	@Get("permissions")
	getPermissions(@Query() { personToken }: QueryWithPersonTokenDto) {
		return this.formPermissionsService.getByPersonToken(personToken);
	}

	/** Get form permissions for a person */
	@Get("permissions/:collectionID")
	getPermissionsByCollectionID(
		@Param("collectionID") collectionID: string,
		@Query() { personToken }: QueryWithPersonTokenDto
	) {
		return this.formPermissionsService.getByCollectionIdAndPersonToken(collectionID, personToken);
	}

	/** Request access to form */
	@Post("permissions/:collectionID")
	requestAccess(
		@Param("collectionID") collectionID: string,
		@Query() { personToken }: QueryWithPersonTokenDto
	) {
		return this.formPermissionsService.requestAccess(collectionID, personToken);
	}

	/** Accept access to form */
	@Put("permissions/:collectionID/:personID")
	acceptAccess(
		@Param("collectionID") collectionID: string,
		@Param("personID") personID: string,
		@Query() { personToken, type }: AcceptAccessDto
	) {
		return this.formPermissionsService.acceptAccess(collectionID, personID, type, personToken);
	}

	/** Remove access to form */
	@Delete("permissions/:collectionID/:personID")
	revokeAccess(
		@Param("collectionID") collectionID: string,
		@Param("personID") personID: string,
		@Query() { personToken }: RevokeAccessDto
	) {
		return this.formPermissionsService.revokeAccess(collectionID, personID, personToken);
	}

	/** Get all forms */
	@Get()
	@SwaggerRemoteRef({ source: "store", ref: "form" })
	@UseInterceptors(createQueryParamsInterceptor(GetAllDto))
	getPage(@Query() { lang }: GetAllDto) {
		return this.formsService.getAll(lang);
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
		return this.formsService.remove(id, personToken);
	}

	/** Get preview of form transformed from json format to schema format */
	@Post("transform")
	@UseGuards(IctAdminGuard)
	@SwaggerRemoteRef({ source: "store", ref: "form" })
	transform(@Body() form: Form, @Query() { personToken, lang = Lang.en }: TransformDto) {
		return this.formsService.transform(form, lang, personToken);
	}
}
