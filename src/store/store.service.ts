import { RestClientService, RestClientOptions }  from "src/rest-client/rest-client.service";
import { getAllFromPagedResource, PaginatedDto } from "src/pagination";
import { MaybeArray, omitCurried } from "src/type-utils";
import { parseQuery, Query } from "./store-query";
import { asArray, doMaybe } from "src/utils";

export type StoreQueryResult<T> = {
	member: T[];
	totalItems: number;
	pageSize: number;
	page: number;
	lastPage: number;
	currentPage: number;
}

type StoreConfig<T> = {
	resource: string;
} & RestClientOptions<T>

const restClientOptions = doMaybe(omitCurried<Omit<RestClientOptions<never>, "serializeInto">>("cache"));

/**
 * A service for using a specific store endpoint, applying the given options to each method, allowing caching
 * and serialization - Expect for `getPage()` and `getAll()` methods, since the whole result shouldn't be serialized.
 * Use `findOne()` to serialize the result.
 *
 * Note that this service isn't provided by dependency injection. That's because there's already a dependency injected
 * service for each store resource. Providing in injectable StoreService would require a token for each resource, which
 * would be unnecessary clumsy.
 */
export class StoreService<T> {

	constructor(private storeRestClient: RestClientService, private config: StoreConfig<T>) {}

	private getOptions(options?: RestClientOptions<T>) {
		return { ...this.config, ...(options || {}) };
	}

	getPage(
		query: Query<T>,
		page = 1,
		pageSize = 20,
		selectedFields: MaybeArray<(keyof T)> = [],
		options?: Omit<RestClientOptions<T>, "serializeInto">
	) {
		return this.storeRestClient.get<StoreQueryResult<T>>(
			this.config.resource,
			{ params: {
				q: parseQuery<T>(query),
				page,
				page_size: pageSize,
				fields: asArray(selectedFields).join(",")
			} },
			// Never cache paged result as the the rest client service's simple caching strategy won't work with it.
			doMaybe(omitCurried<RestClientOptions>("cache", "serializeInto"))
			(restClientOptions(this.getOptions(options)))
		);
	}

	getAll(query: Query<T>, options?: Omit<RestClientOptions<never>, "serializeInto">) {
		return getAllFromPagedResource(
			async (page: number) => storePageToPaginatedDto(
				await this.getPage(query, page, 10000, undefined, options)
			),
		);
	}

	get(id: string, options?: RestClientOptions<T>) {
		return this.storeRestClient.get<T>(`${this.config.resource}/${id}`, undefined, restClientOptions(options));
	}

	async findOne(query: Query<T>, selectedFields?: MaybeArray<keyof T>) {
		return RestClientService.applyOptions(
			(await this.getPage(query, 1, 1, selectedFields)).member[0],
			restClientOptions(restClientOptions(this.config))
		);
	}

	create(item: Partial<T>, options?: RestClientOptions<T>) {
		return this.storeRestClient.post<T, Partial<T>>(
			this.config.resource,
			item,
			undefined,
			restClientOptions(options)
		);
	}

	update<TT extends T & {id: string}>(item: TT, options?: RestClientOptions<T>) {
		return this.storeRestClient.put<T>(
			`${this.config.resource}/${item.id}`,
			item,
			undefined,
			restClientOptions(options)
		);
	}

	delete<T>(id: string, options?: RestClientOptions<T>) {
		return this.storeRestClient.delete(`${this.config.resource}/${id}`, undefined, restClientOptions(options));
	}
}

const storePageToPaginatedDto = <T>(page: StoreQueryResult<T>): Pick<PaginatedDto<T>,
	"results" | "lastPage" | "currentPage"> => ({
		...page,
		results: page.member
	});
