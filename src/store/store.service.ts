import { Inject, Injectable } from "@nestjs/common";
import { RestClientService, LajiApiOptions }  from "src/rest-client/rest-client.service";
import { getAllFromPagedResource, PaginatedDto } from "src/pagination";
import { MaybeArray, omit } from "src/type-utils";
import { parseQuery, Query } from "./store-query";
import { asArray } from "src/utils";

export type StoreQueryResult<T> = {
	member: T[];
	totalItems: number;
	pageSize: number;
	page: number;
	lastPage: number;
	currentPage: number;
}

@Injectable()
export class StoreService {
	constructor(@Inject("STORE_REST_CLIENT") private storeRestClient: RestClientService) {}

	private getPageWith = <T>(resource: string, options?: Omit<LajiApiOptions<any>, "serializeInto">) =>
		(query: Query<T>, page = 1, pageSize = 20, selectedFields: MaybeArray<(keyof T)> = []) => {
			return this.storeRestClient.get<StoreQueryResult<T>>(
				resource,
				{ params: {
					q: parseQuery<T>(query),
					page,
					page_size: pageSize,
					fields: asArray(selectedFields).join(",")
				} },
				options
			);
		};

	private getAllWith = <T>(resource: string, options?: Omit<LajiApiOptions<any>, "serializeInto">) =>
		async (query: Query<T>) => {
			return getAllFromPagedResource(
				async (page: number) => storePageToPaginatedDto(
					await this.getPageWith<T>(resource, options)(query, page, 10000)
				),
			);
		};

	getWith = <T>(resource: string, options?: LajiApiOptions<T>) => (id: string) =>
		this.storeRestClient.get<T>(`${resource}/${id}`, undefined, options);

	private createWith = <T>(resource: string, options?: LajiApiOptions<T>) => (item: Partial<T>) =>
		this.storeRestClient.post<Partial<T>>(resource, item, undefined, options) as Promise<T>;

	private updateWith = <T extends {id: string}>(resource: string, options?: LajiApiOptions<T>) => (item: T) =>
		this.storeRestClient.put<T>(`${resource}/${item.id}`, item, undefined, options);

	private deleteWith = (resource: string) => (id: string) =>
		this.storeRestClient.delete(`${resource}/${id}`, undefined);

	getPage = <T>(
		resource: string,
		query: Query<T>,
		page = 1,
		pageSize = 20,
		selectedFields: (keyof T)[] = [],
		options?: LajiApiOptions<any> & { serializeInto?: undefined }) =>
			this.getPageWith<T>(resource, options)(query, page, pageSize, selectedFields);

	getAll = <T>(resource: string, query: Query<T>, options?: Omit<LajiApiOptions<any>, "serializeInto">) =>
		this.getAllWith<T>(resource, options)(query);

	get = <T>(resource: string, id: string, options?: LajiApiOptions<T>) =>
		this.getWith<T>(resource, options)(id);

	create = <T>(resource: string, item: Partial<T>, options?: LajiApiOptions<T>) =>
		this.createWith<T>(resource, options)(item);

	update<T extends {id: string}>(resource: string, item: T, options?: LajiApiOptions<T>) {
		return this.updateWith(resource, options)(item);
	}

	async delete(resource: string, id: string) {
		await this.deleteWith(resource)(id);
	}

	/**
	 * Creates a service for using a specific store endpoint, applying the given options to each method, allowing caching
	 * and serialization - Expect for `getPage()` and `getAll()` methods, since the whole result shouldn't be serialized.
	 * Use `findOne()` to serialize the result.
	 */
	forResource = <T extends {id: string}>(resource: string, options?: LajiApiOptions<T>) => ({
		/** The result won't be serialized for performance reasons. You should rely on query-params interceptor serializing the page. */
		getPage: this.getPageWith<T>(resource, options ? omit(options, "serializeInto") : undefined),

		/** The result won't be serialized for performance reasons. */
		getAll: this.getAllWith<T>(resource, options ? omit(options, "serializeInto") : undefined),

		findOne: async (query: Query<T>, selectedFields?: MaybeArray<keyof T>) =>
			RestClientService.applyOptions(
				(await this.getPageWith<T>(resource)(query, 1, 1, selectedFields)).member[0],
				options
			),

		get: this.getWith<T>(resource, options),

		/** Busts cache for the resource, if caching is enabled in options. */
		create: this.createWith<T>(resource, options),

		/** Busts cache for the resource, if caching is enabled in options. */
		update: this.updateWith<T>(resource, options),

		/** Busts cache for the resource, if caching is enabled in options. */
		delete: this.deleteWith(resource)
	});
}

const storePageToPaginatedDto = <T>(page: StoreQueryResult<T>): Pick<PaginatedDto<T>,
	"results" | "lastPage" | "currentPage"> => ({
		...page,
		results: page.member
	});
