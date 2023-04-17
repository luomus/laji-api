import { Type } from "class-transformer";
import { IsInt } from "class-validator";

export class PagedDto {
	@Type(() => Number)
	@IsInt()
	page?: number = 1;

	@Type(() => Number)
	@IsInt()
	pageSize?: number = 20;
}

export class QueryWithPersonTokenDto {
	/**
	 * Person's authentication token
	 */
	personToken: string;
}
