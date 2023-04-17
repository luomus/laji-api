import { Inject, Injectable } from "@nestjs/common";
import { RestClientService, LajiApiOptions }  from "src/rest-client/rest-client.service";

interface StoreQueryResult<T> {
	member: T[];
	totalItems: number;
	pageSize: number;
	page: number;
	lastPage: number;
	currentPage: number;
}

export type StoreServiceForResource<T extends { id: string }> = {
	query: (query: string, page?: number, pageSize?: number) => Promise<StoreQueryResult<T>>;
	findOne: (query: string) => Promise<T>;
	/**
	 * Busts cache for the resource, if caching is enabled in options.
	 */
	create: (item: Partial<T>) => Promise<T>;
	/**
	 * Busts cache for the resource, if caching is enabled in options.
	 */
	update: (item: T) => Promise<T>;
	/**
	 * Busts cache for the resource, if caching is enabled in options.
	 */
	delete: (id: string) => Promise<void>;
}

@Injectable()
export class StoreService {
	constructor(@Inject("STORE_REST_CLIENT") private storeRestClient: RestClientService) {}

	private _query = <T>(resource: string, options?: LajiApiOptions<StoreQueryResult<T>>) =>
		(query: string, page = 1, pageSize = 20) => 
			this.storeRestClient.get<StoreQueryResult<T>>(
				resource,
				{ params: { q: query, page, page_size: pageSize } },
				options
			);

	private _create = <T>(resource: string, options?: LajiApiOptions<T>) => (item: Partial<T>) =>
		this.storeRestClient.post<Partial<T>>(resource, item, undefined, options) as Promise<T>;

	private _update = <T extends {id: string}>(resource: string, options?: LajiApiOptions<T>) => (item: T) =>
		this.storeRestClient.put<T>(`${resource}/${item.id}`, item, undefined, options);

	private _delete = (resource: string) => (id: string) =>
		this.storeRestClient.delete(`${resource}/${id}`, undefined);

	query = <T>(
		resource: string,
		query: string,
		page = 1,
		pageSize = 20,
		options?: LajiApiOptions<StoreQueryResult<T>>) =>
		this._query<T>(resource, options)(query, page, pageSize);

	create = <T>(resource: string, item: Partial<T>, options?: LajiApiOptions<T>) =>
		this._create<T>(resource, options)(item);

	update<T extends {id: string}>(resource: string, item: T, options?: LajiApiOptions<T>) {
		return this._update(resource, options)(item);
	}

	async delete(resource: string, id: string) {
		await this._delete(resource)(id);
	}

	/**
	 * Creates a service for using a specific store endpoint, applying the given options to each method, allowing caching
	 * and serialization - Expect for `query()` method, since the whole result shouldn't be serialized. Use `findOne()`
	 * to serialize the result.
	 */	
	forResource = <T extends {id: string}>(resource: string, options?: LajiApiOptions<T>)
		: StoreServiceForResource<T> => ({
		query: this._query<T>(resource, options ? { ...options, serializeInto: undefined } : undefined),
		findOne: async (query: string) => 
			RestClientService.applyOptions((await this._query<T>(resource)(query, 1, 1)).member[0], options),
		create: this._create<T>(resource, options),
		update: this._update<T>(resource, options),
		delete: this._delete(resource)
	})
}
