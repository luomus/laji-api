import { HttpException, Inject, Injectable } from "@nestjs/common";
import { RestClientService, LajiApiOptions }  from "src/rest-client/rest-client.service";
import { getAllFromPagedResource, PaginatedDto } from "src/pagination";

interface StoreQueryResult<T> {
	member: T[];
	totalItems: number;
	pageSize: number;
	page: number;
	lastPage: number;
	currentPage: number;
}

export type StoreServiceForResource<T extends { id: string }> = {
	/** The result won't be serialized for performance reasons. */
	getPage: (query: StoreQuery, page?: number, pageSize?: number) => Promise<StoreQueryResult<T>>;
	/** The result won't be serialized for performance reasons. */
	getAll: (query: StoreQuery) => Promise<T[]>;
	findOne: (query: StoreQuery) => Promise<T>;
	get: (id: string) => Promise<T>;
	/** Busts cache for the resource, if caching is enabled in options. */
	create: (item: Partial<T>) => Promise<T>;
	/** Busts cache for the resource, if caching is enabled in options. */
	update: (item: T) => Promise<T>;
	/** Busts cache for the resource, if caching is enabled in options. */
	delete: (id: string) => Promise<void>;
}

const storePageToPaginatedDto = <T>(page: StoreQueryResult<T>): Pick<PaginatedDto<T>,
	"results" | "lastPage" | "currentPage"> => ({
		...page,
		results: page.member
	});

export type StoreQuery = Record<string, string | boolean>;

@Injectable()
export class StoreService {
	constructor(@Inject("STORE_REST_CLIENT") private storeRestClient: RestClientService) {}

	private getPageWith = <T>(resource: string, options?: (LajiApiOptions<any> & { serializeInto?: undefined })) =>
		(query: StoreQuery | string, page = 1, pageSize = 20) =>
			this.storeRestClient.get<StoreQueryResult<T>>(
				resource,
				{ params: { q: typeof query === "string" ? query : parseQuery(query), page, page_size: pageSize } },
				options
			);

	private getAllWith = <T>(resource: string, options?: (LajiApiOptions<any> & { serializeInto?: undefined })) =>
		async (query: StoreQuery) => {
			return getAllFromPagedResource(
				async (page: number) => storePageToPaginatedDto(
					await this.getPageWith<T>(resource, options)(query, page, 10000)
				),
			);
		};

	private createWith = <T>(resource: string, options?: LajiApiOptions<T>) => (item: Partial<T>) =>
		this.storeRestClient.post<Partial<T>>(resource, item, undefined, options) as Promise<T>;

	private updateWith = <T extends {id: string}>(resource: string, options?: LajiApiOptions<T>) => (item: T) =>
		this.storeRestClient.put<T>(`${resource}/${item.id}`, item, undefined, options);

	private deleteWith = (resource: string) => (id: string) =>
		this.storeRestClient.delete(`${resource}/${id}`, undefined);

	getPage = <T>(
		resource: string,
		query: StoreQuery,
		page = 1,
		pageSize = 20,
		options?: LajiApiOptions<any> & { serializeInto?: undefined }) =>
			this.getPageWith<T>(resource, options)(query, page, pageSize);

	getAll = <T>(resource: string, query: StoreQuery, options?: LajiApiOptions<any> & { serializeInto?: undefined }) =>
		this.getAllWith<T>(resource, options)(query);

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
	forResource = <T extends {id: string}>(resource: string, options?: LajiApiOptions<T>)
		: StoreServiceForResource<T> => ({
			getPage: this.getPageWith<T>(resource, options ? { ...options, serializeInto: undefined } : undefined),
			getAll: this.getAllWith<T>(resource, options ? { ...options, serializeInto: undefined } : undefined),
			findOne: async (query: StoreQuery) =>
				RestClientService.applyOptions((await this.getPageWith<T>(resource)(query, 1, 1)).member[0], options),
			get: async (id: string) => {
				const result = (await this.getPageWith<T>(resource)(id, 1, 1)).member[0];
				if (!result) {
					throw new HttpException("Store resource not found", 404);
				}
				return RestClientService.applyOptions(result, options);
			},
			create: this.createWith<T>(resource, options),
			update: this.updateWith<T>(resource, options),
			delete: this.deleteWith(resource)
		});
}

const parseQuery = (query: StoreQuery) => Object.keys(query).map(k => `${k}:"${query[k]}"`).join(" AND ");
