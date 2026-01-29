import { HttpService } from "@nestjs/axios";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { AxiosRequestConfig } from "axios";
import { firstValueFrom } from "rxjs";
import { map } from "rxjs/operators";
import { JSONObjectSerializable, Newable } from "src/typing.utils";
import { serializeInto } from "src/serialization/serialization.utils";
import { doForDefined } from "src/utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

export type RestClientOptions<T> = Partial<HasMaybeSerializeInto<T>> & {
	/**
	 * Perform a transformation for the resource fetched with a GET request. Useful for making transformations before
	 * caching.
	 */
	transformer?: (result: T) => T;
	/**
	 * If it's single resource endpoint, this option enables smarter caching strategy. If enabled, the client must be
	 * always used like this:
	 *
	 * GET is done to "/" and "/:id"
	 * POST is done to "/" ("/:id" doesn't break anything but doesn't make sense)
	 * PUT is done to "/:id"
	 * DELETE is done to "/:id"
	 */
	singleResourceEndpoint?: boolean
	cache?: number;
};

export type RestClientConfig<T> = RestClientOptions<T> & {
	/** Used for logging purposes */
	name: string;
	host?: string;
	auth?: string;
	headers?: Record<string, string | undefined>;
	params?: JSONObjectSerializable;
};

export type HasMaybeSerializeInto<T> = {
	/** A class that that the result will be serialized into. */
	serializeInto?: Newable<T>;
}

const joinOverflowWithRightSide = (str: string, str2: string) =>
	str.length + str2.length > 24
		? str.slice(0, 20 - str2.length) + ".../" + str2
		: str + "/" + str2;

type SWRCacheEntry<S> = {
	data: S,
	timestamp: number
}

/**
 * Abstract wrapper for a service that connects to a remote REST API. The implementing service can "provide (nestTM)"
 * this service and fill in the REST_CLIENT_CONFIG.
 *
 * Enables caching based on the assumption that it's a REST API; GET responses are cached, until a POST, PUT or DELETE
 * is made to the same path.
 *
 * Caching can be configured to be for all request, or request-specific. Request-specific caching can be done by adding
 * the `cache` option to each method (get, put, post, del). The client must give the option to bust the cache for a
 * path.
 *
 * Caching includes Redis cache and also in-flight request deduplication.
 */
// Both caches (Redis and the in-flight request cache in app memory) use a structure where there's a map
// between host + path (without query params), and it's values are a map between full uri (host, path, query params) and
// their results. This way we can bust the cache by just a path.
//
// Given host = "https://foo.com" and path = "bar", the Redis/in-flight cache maps look like this:
//
// { "https://foo.com/bar": {
// "https://foo.com/bar?param1=foo": "cached example value 1",
// "https://foo.com/bar?param2=bar": "cached example value 2",
// } }
@Injectable()
export class RestClientService<T = unknown> {

	private readonly logger = new Logger(joinOverflowWithRightSide(RestClientService.name, this.config.name));
	private readonly hostAndPathToInFlightRequests = new Map<string, Map<string, Promise<any>>>();

	constructor(
		private readonly httpService: HttpService,
		@Inject("REST_CLIENT_CONFIG") private readonly config: RestClientConfig<T>,
		private readonly cache?: RedisCacheService
	) { }

	private getRequestConfig(config: AxiosRequestConfig = {}) {
		const { auth } = this.config;
		const headers = { ...(this.config.headers || {}) };
		if (auth) {
			headers.Authorization = auth;
		}
		return {
			...config,
			headers: {
				...headers,
				...(config.headers || {})
			},
			params: {
				...(this.config.params || {}),
				...(config.params || {})
			},
			meta: {
				logger: this.logger
			}
		};
	}

	private getHostAndPath(path?: string) {
		if (!this.config.host) {
			return path || "";
		}
		if (path === undefined) {
			return this.config.host;
		}
		return `${this.config.host}/${path}`;
	}

	static applyOptions<T>(item: undefined, options?: RestClientOptions<T>): undefined;
	static applyOptions<T>(item: T, options?: RestClientOptions<T>): T;
	static applyOptions<T>(item: T | undefined, options?: RestClientOptions<T>): T | undefined {
		return options?.serializeInto
			? doForDefined(serializeInto(options.serializeInto))(item)
			: item;
	}

	private getURL(path?: string, config?: AxiosRequestConfig) {
		const query = new URLSearchParams(config?.params).toString();
		return this.getHostAndPath(path) + (query ? `?${query}` : "");
	}

	private getCacheTTL(options?: RestClientOptions<unknown>) {
		if (options && "cache" in options) {
			return options.cache;
		}
		return this.config.cache;
	}

	private async getAndCache<S>(path?: string, config?: AxiosRequestConfig, options?: RestClientOptions<S>)
	: Promise<S> {
		const url = this.getURL(path, this.getRequestConfig(config));
		const cacheTTL = this.getCacheTTL(options);
		const hostAndPath = this.getHostAndPath(path);

		const result = await firstValueFrom(
			this.httpService.get<S>(hostAndPath, this.getRequestConfig(config)).pipe(map(r =>
				options?.transformer ? options.transformer(r.data) : r.data
			))
		);

		if (cacheTTL) {
			const cacheForHostAndPath = await this.cache!.get<Record<string, SWRCacheEntry<S>>>(hostAndPath)
				|| {} as Record<string, SWRCacheEntry<S>>;
			cacheForHostAndPath![url] = { data: result, timestamp: Date.now() };
			await this.cache!.set(
				hostAndPath,
				cacheForHostAndPath!
			);
		}

		return result;
	}

	private getWithInFlightDeduplication<S>(
		path?: string,
		config?: AxiosRequestConfig
	) { return async (createRequest: () => Promise<S>): Promise<S> => {
		const url = this.getURL(path, this.getRequestConfig(config));
		const hostAndPath = this.getHostAndPath(path);
		// Read the comment for the class at the top to understand the map structure.
		const inFlightRequestsForHostAndPath = this.hostAndPathToInFlightRequests.get(hostAndPath);
		if (inFlightRequestsForHostAndPath?.has(url)) {
			this.logger.debug(`GET (IN-FLIGHT) ${url}`);
			return (inFlightRequestsForHostAndPath.get(url) as Promise<S>);
		}
		if (!this.hostAndPathToInFlightRequests.has(hostAndPath)) {
			this.hostAndPathToInFlightRequests.set(hostAndPath, new Map());
		}
		const inFlightRequest = createRequest();
		this.hostAndPathToInFlightRequests.get(hostAndPath)!.set(url, inFlightRequest);
		let result: Awaited<S>;
		try {
			result = await inFlightRequest;
		} finally {
			this.hostAndPathToInFlightRequests.get(hostAndPath)?.delete(url);
		}
		return result;
	}; }

	private getWithStaleWhileRevalidate<S>(
		path?: string,
		config?: AxiosRequestConfig,
		options?: RestClientOptions<S>
	) { return async (request: Promise<S>): Promise<S> => {
		const cacheTTL = this.getCacheTTL(options);

		if (!cacheTTL) {
			return request;
		}

		const url = this.getURL(path, this.getRequestConfig(config));
		const hostAndPath = this.getHostAndPath(path);
		const cacheForHostAndPath = (await this.cache!.get<Record<string, SWRCacheEntry<S>>>(hostAndPath))
			|| {} as Record<string, SWRCacheEntry<S>>;
		const staleWhileRevalidateEntry = url in cacheForHostAndPath
			? cacheForHostAndPath[url]
			: undefined;
		if (!staleWhileRevalidateEntry) {
			return request;
		}
		const isFresh = staleWhileRevalidateEntry.timestamp + cacheTTL > Date.now();
		if (!isFresh) {
			void request;
		}
		return staleWhileRevalidateEntry.data;
	}; }

	async get<S = T>(path?: string, config?: AxiosRequestConfig, options?: RestClientOptions<S>): Promise<S> {
		return this.getWithStaleWhileRevalidate<S>(path, config, options)(
			this.getWithInFlightDeduplication<S>(path, config)(
				() => this.getAndCache<S>(path, config, options)
			)
		);
	}

	async post<Out = T, In = T>(
		path?: string,
		body?: In, config?: AxiosRequestConfig,
		options?: RestClientOptions<Out>
	): Promise<Out> {
		this.flushInFlightCache(path, options);
		const result = RestClientService.applyOptions(await firstValueFrom(
			this.httpService.post<Out>(this.getHostAndPath(path), body, this.getRequestConfig(config))
				.pipe(map(r => r.data))
		), options);
		await this.flushCache(path, options);
		return result;
	}

	async put<Out = T, In = T>(
		path?: string,
		body?: In,
		config?: AxiosRequestConfig,
		options?: RestClientOptions<Out>
	): Promise<Out> {
		this.flushInFlightCache(path, options);
		const result = RestClientService.applyOptions(await firstValueFrom(
			this.httpService.put<Out>(this.getHostAndPath(path), body, this.getRequestConfig(config))
				.pipe(map(r => r.data))
		), options);
		await this.flushCache(path, options);
		return result;
	}

	async delete<Out = unknown>(
		path?: string,
		config?: AxiosRequestConfig,
		options?: RestClientOptions<never>
	): Promise<Out> {
		this.flushInFlightCache(path, options);
		const result = await firstValueFrom(
			this.httpService.delete<Out>(this.getHostAndPath(path), this.getRequestConfig(config))
				.pipe(map(r => r.data))
		);
		await this.flushCache(path, options);
		return result;
	}

	async flushCache(path?: string, options?: RestClientOptions<unknown>) {
		if (options?.singleResourceEndpoint) {
			await this.cache!.del(this.getHostAndPath());
		}
		await this.cache!.del(this.getHostAndPath(path));
	}

	flushInFlightCache(path?: string, options?: RestClientOptions<unknown>) {
		if (options?.singleResourceEndpoint) {
			this.hostAndPathToInFlightRequests.delete(this.getHostAndPath());
		}
		this.hostAndPathToInFlightRequests.delete(this.getHostAndPath(path));
	}
}
