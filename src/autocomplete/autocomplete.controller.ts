import { CallHandler, ExecutionContext, Get, Injectable, NestInterceptor, Query, UseInterceptors, Version }
	from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { AutocompleteService } from "./autocomplete.service";
import { GetFriendsDto, GetFriendsResponseDto, IncludePayloadDto } from "./autocomplete.dto";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";
import { Observable, map } from "rxjs";
import { plainToClass } from "class-transformer";
import { Request } from "src/request";
import { omit } from "src/typing.utils";
import { applyToResult } from "src/pagination.utils";
import { ResultsArray } from "src/interceptors/results-array.interceptor";

@Injectable()
export class IncludePayloadInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		const { includePayload } = plainToClass(IncludePayloadDto, request.query);
		return next.handle().pipe(map(applyToResult(mapIncludePayload(includePayload))));
	}
}

const mapIncludePayload = (includePayload = false) => (result: any) =>
	includePayload ? result : omit(result, "payload");

@ApiTags("Autocomplete")
@LajiApiController("autocomplete")
export class AutocompleteController {

	constructor(private autocompleteService: AutocompleteService) {}

	@Get("/friends")
	@UseInterceptors(IncludePayloadInterceptor, ResultsArray)
	@Version("1")
	@ApiOkResponse({
		schema: {
			type: "object",
			properties: {
				results: {
					type: "array",
					items:  { $ref: getSchemaPath(GetFriendsResponseDto) }
				}
			}
		}
	})
	@ApiExtraModels(GetFriendsResponseDto)
	getFriends(@PersonToken() person: Person, @Query() _: GetFriendsDto) {
		return this.autocompleteService.getFriends(person);
	}
}
