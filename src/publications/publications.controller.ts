import { Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { PublicationsService } from "./publications.service";
import { pipe } from "rxjs";
import { idAlwaysPresent } from "src/collections/collections.controller";
import { JSONSchemaRef } from "src/json-schema.utils";
import { SwaggerRemote } from "src/swagger/swagger-remote.decorator";
import { firstFromNonEmptyArr, asTuple } from "src/utils";

@ApiTags("Publications")
@LajiApiController("publications")
export class PublicationsController {
	constructor(private publicationsService: PublicationsService) {}

	@Get(":id")
	@SwaggerRemote({
		source: "store",
		ref: "/publication",
		customizeResponseSchema: (schema, document) => pipe(
			idAlwaysPresent,
			firstFromNonEmptyArr
		)(asTuple(schema as JSONSchemaRef, document)),
	})
	get(@Param("id") id: string) {
		return this.publicationsService.get(id);
	}
}
