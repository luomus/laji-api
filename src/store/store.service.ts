import { RestClientService, RestClientOptions, HasMaybeSerializeInto }  from "src/rest-client/rest-client.service";
import { getAllFromPagedResource, PaginatedDto } from "src/pagination";
import { KeyOf, MaybeArray, omitForKeys } from "src/type-utils";
import { parseQuery, Query } from "./store-query";
import { asArray, doMaybe } from "src/utils";
import { Injectable, Logger } from "@nestjs/common";
import { OnlyNonArrayLiteralKeys, QueryCacheOptions, StoreCacheOptions, getCacheKeyForQuery, getCacheKeyForResource
} from "./store-cache";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

export type StoreQueryResult<T> = {
	member: T[];
	totalItems: number;
	pageSize: number;
	page: number;
	lastPage: number;
	currentPage: number;
}

export type StoreConfig<T = never> = HasMaybeSerializeInto<T> & {
	resource: string;
	cache?: StoreCacheOptions<T> & {
		/** Milliseconds for the cache TTL */
		ttl?: number;
		primaryKeySpaces?: StoreCacheOptions<T>["primaryKeys"][]
	}
}

/**
 * A service for using a specific store endpoint, applying the given options to each method, allowing caching
 * and serialization - Expect for `getPage()` and `getAll()` methods, since the whole result shouldn't be serialized.
 * Use `findOne()` to serialize the result.
 */
@Injectable()
export class StoreService<T extends { id?: string }> {

	private logger = new Logger(StoreService.name + "/" + this.config.resource);
	private restClientOptions = doMaybe(omitForKeys<StoreConfig<T>>("resource", "cache"));

	constructor(
		private storeClient: RestClientService<T>,
		private readonly cache: RedisCacheService,
		private config: StoreConfig<T>
	) {}

	async getPage(
		query: Query<T>,
		page = 1,
		pageSize = 20,
		selectedFields: MaybeArray<KeyOf<T>> = [],
		cacheOptions?: QueryCacheOptions<T>
	) {
		let cacheKey: string | undefined;
		if (this.config.cache) {
			cacheKey = this.cacheKeyForPagedQuery(query, page, pageSize, asArray(selectedFields), cacheOptions);
			const cached = await this.cache.get<StoreQueryResult<T>>(cacheKey);
			if (cached) {
				return cached;
			}
		}
		const result = await this.storeClient.get<StoreQueryResult<T>>(
			this.config.resource,
			{ params: {
				q: parseQuery<T>(query),
				page,
				page_size: pageSize,
				fields: asArray(selectedFields).join(",")
			} },
			doMaybe(omitForKeys<RestClientOptions<T>>("serializeInto"))(this.restClientOptions(this.config))
		);
		if (this.config.cache) {
			await this.cache.set(cacheKey!, result);
		}
		return result;
	}

	async getAll(query: Query<T>, cacheOptions?: QueryCacheOptions<T>) {
		return getAllFromPagedResource(
			async (page: number) => storePageToPaginatedDto(await this.getPage(
				query, page, 10000, undefined, cacheOptions
			))
		);
	}

	async findOne(query: Query<T>, selectedFields?: MaybeArray<KeyOf<T>>, cacheOptions?: QueryCacheOptions<T>) {
		return RestClientService.applyOptions(
			(await this.getPage(query, 1, 1, selectedFields, cacheOptions)).member[0],
			this.restClientOptions(this.config)
		);
	}

	async get(id: string): Promise<T & { id: string }> {
		const { cache } = this.config;
		if (cache) {
			const cached = await this.cache.get<T & { id: string }>(this.withCachePrefix(id));
			if (cached) {
				return RestClientService.applyOptions(cached, this.restClientOptions(this.config));
			}
		}
		const result = await this.storeClient.get<T & { id: string }>(`${this.config.resource}/${id}`,
			undefined,
			this.restClientOptions(this.config));
		if (cache) {
			await this.cache.set(this.withCachePrefix(id), result);
		}
		return result;
	}

	async create(item: Partial<T>) {
		const result = await this.storeClient.post<T & { id: string }, Partial<T>>(
			this.config.resource,
			item,
			undefined,
			this.restClientOptions(this.config)
		);
		if (this.config.cache) {
			await this.cache.del(this.withCachePrefix(result.id));
			await this.bustCacheForResult(result);
		}
		return result;
	}

	async update<TT extends T & {id: string}>(item: TT) {
		const result = await this.storeClient.put<T & { id: string }, TT>(
			`${this.config.resource}/${item.id}`,
			item,
			undefined,
			this.restClientOptions(this.config)
		);
		if (this.config.cache) {
			await this.cache.del(this.withCachePrefix(result.id));
			await this.bustCacheForResult(result);
		}
		return result;
	}

	async delete(id: string) {
		const { cache } = this.config;
		let existing: T & { id: string } | undefined;

		if (cache) {
			try {
				existing = await this.get(id);
			} catch (e) { } // Handled later.
		}

		const path = `${this.config.resource}/${id}`;
		const result = await this.storeClient.delete(path, undefined, this.restClientOptions(this.config));

		if (cache) {
			await this.cache.del(this.withCachePrefix(id));
			if (!existing) {
				// eslint-disable-next-line max-len
				this.logger.error("Store delete request was successful for an item that couldn't be fetched prior. This situation should be impossible and is catastrophic for caching! Flushing the whole cache for the resource.");
				await this.cache.del(this.withCachePrefix("*"));
				return result;
			}
			await this.bustCacheForResult(existing);
		}
		return result;
	}

	private withCachePrefix(key: string) {
		return `STORE_${this.config.resource}:${key}`;
	}

	private tokenizePrimaryKeys(primaryKeys: StoreCacheOptions<T>["primaryKeys"] = []): string {
		return primaryKeys.sort().join(";");
	}

	private async bustCacheForResult(result: T) {
		for (const cacheKey of this.cacheKeysForPagedResource(result)) {
			await this.cache.patternDel(cacheKey);
		}
	}

	private queryCacheSpaces: Record<string, StoreCacheOptions<T>["primaryKeys"]> = (
		this.config.cache?.primaryKeySpaces
		|| [this.config.cache?.primaryKeys || [] as OnlyNonArrayLiteralKeys<T>[]]
	).reduce<Record<string, StoreCacheOptions<T>["primaryKeys"]>>(
		(tokenToPrimaryKeys, primaryKeys) => {
			tokenToPrimaryKeys[this.tokenizePrimaryKeys(primaryKeys)] = primaryKeys;
			return tokenToPrimaryKeys;
		}, {});

	private getCacheConfig(primaryKeys?: StoreCacheOptions<T>["primaryKeys"]) {
		if (!this.config.cache) {
			throw new Error("Cache not configured");
		}
		const config = { ...this.config.cache };
		if (primaryKeys) {
			config.primaryKeys = primaryKeys;
		}
		return config;
	}

	private cacheKeyForPagedQuery(
		query: Query<T>,
		page: number,
		pageSize: number,
		selectedFields: KeyOf<T>[],
		queryCacheOptions: Pick<QueryCacheOptions<T>, "primaryKeys"> = {}
	) {
		if (!this.config.cache) {
			throw new Error("Can't get a cache key for a query if caching isn't enabled in config");
		}
		const pagedSuffix = `:${[page, pageSize,selectedFields.join(",") || "*"].join(":")}`;
		const config = this.getCacheConfig(queryCacheOptions.primaryKeys);
		const queryCacheKey = getCacheKeyForQuery(query, config);
		const cacheSpaceToken = this.tokenizePrimaryKeys(config.primaryKeys);
		return this.withCachePrefix(cacheSpaceToken + ":" + queryCacheKey) + pagedSuffix;
	}

	private cacheKeysForPagedResource(resource: Partial<T>) {
		if (!this.config.cache) {
			throw new Error("Can't get a cache key for a resource if caching isn't enabled in config");
		}
		const pagedSuffix = ":*:*:*";
		return Object.keys(this.queryCacheSpaces).map(cacheSpaceToken => {
			const config = this.queryCacheSpaces[cacheSpaceToken];
			return this.withCachePrefix(cacheSpaceToken + ":" + getCacheKeyForResource<T>(
				resource,
				this.getCacheConfig(config)
			)) + pagedSuffix;
		});
	}
}

const storePageToPaginatedDto = <T>(page: StoreQueryResult<T>): Pick<PaginatedDto<T>,
	"results" | "lastPage" | "currentPage"> => ({
		...page,
		results: page.member
	});
