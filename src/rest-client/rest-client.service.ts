import { HttpService } from "@nestjs/axios";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { AxiosRequestConfig } from "axios";
import { firstValueFrom } from "rxjs";
import { map } from "rxjs/operators";
import { JSONObjectSerializable, Newable, isObject } from "src/typing.utils";
import { serializeInto } from "src/serialization/serialization.utils";
import { CacheOptions, doForDefined, getCacheTTL } from "src/utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

type CacheOptionsObjectConfig = {
	/**
	 * If it's single endpoint, this option enables smarter caching strategy. If it's a singleResourceEndpoint, it must be
	 * always used like this:
	 *
	 * GET is done to "/" and "/:id"
	 * POST is done to "/" ("/:id" doesn't break anything but doesn't make sense)
	 * PUT is done to "/:id"
	 * DELETE is done to "/:id"
	 */
	singleResourceEndpoint?: boolean
	/** Milliseconds for the cache TTL */
	ttl?: number;
}

const isCacheOptionsObject = (cache: CacheOptions["cache"] | CacheOptionsObjectConfig)
	: cache is CacheOptionsObjectConfig => isObject(cache);

export type RestClientOptions<T> = Partial<HasMaybeSerializeInto<T>> & {
	/**
	 * Perform a transformation for the resource fetched with a GET request. Useful for making transformations before
	 * caching.
	 */
	transformer?: (result: T) => T;
	cache?: CacheOptions["cache"] | CacheOptionsObjectConfig;
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
 */
@Injectable()
export class RestClientService<T = unknown> {

	private logger = new Logger(joinOverflowWithRightSide(RestClientService.name, this.config.name));

	constructor(
		private readonly httpService: HttpService,
		@Inject("REST_CLIENT_CONFIG") private readonly config: RestClientConfig<T>,
		private cache?: RedisCacheService
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
			const msg = `Missing host config for ${this.config.name} client`;
			this.logger.error(msg);
			throw new Error(msg);
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

	private getCacheConf(options?: RestClientOptions<unknown>) {
		if (options && "cache" in options) {
			return options.cache;
		}
		return this.config.cache;
	}

	private async getWithCache<S>(path?: string, config?: AxiosRequestConfig, options?: RestClientOptions<S>)
	: Promise<S> {
		// We cache a map where keys are the path without query params, and the keys are the full uri with host, path and query params.
		// This way we can bust the cache by just the path.
		//
		// Example for cachedByPath, where this.path = "https://foo.bar", path = "path":
		// { "https://foo.bar/path": {
		// "https://foo.bar/path?param1=foo": "cached example value 1",
		// "https://foo.bar/path?param2=bar": "cached example value 2",
		// } }
		let cachedByHostAndPath: Record<string, S>;
		const url = this.getURL(path, this.getRequestConfig(config));
		if (this.getCacheConf(options)) {
			cachedByHostAndPath = await this.cache!.get<Record<string, S>>(this.getHostAndPath(path))
				|| {} as Record<string, S>;
			const cached = url in cachedByHostAndPath
				? cachedByHostAndPath[url]
				: undefined;
			if (cached) {
				this.logger.debug(`GET (CACHED) ${url}`);
				return cached;
			}
		}
		const result = await firstValueFrom(
			this.httpService.get<S>(this.getHostAndPath(path), this.getRequestConfig(config)).pipe(map(r =>
				options?.transformer ? options.transformer(r.data) : r.data
			))
		);
		const cacheConf = this.getCacheConf(options);
		if (cacheConf) {
			/* eslint-disable @typescript-eslint/no-non-null-assertion */
			cachedByHostAndPath![url] = result;
			await this.cache!.set(this.getHostAndPath(path), cachedByHostAndPath!, getCacheTTL(cacheConf));
			/* eslint-enable @typescript-eslint/no-non-null-assertion */
		}
		return result;
	}

	async get<S = T>(path?: string, config?: AxiosRequestConfig, options?: RestClientOptions<S>) {
		return RestClientService.applyOptions<S>(await this.getWithCache<S>(path, config, options), options);
	}

	async post<Out = T, In = T>(
		path?: string,
		body?: In, config?: AxiosRequestConfig,
		options?: RestClientOptions<Out>
	) {
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
	) {
		const result = RestClientService.applyOptions(await firstValueFrom(
			this.httpService.put<Out>(this.getHostAndPath(path), body, this.getRequestConfig(config))
				.pipe(map(r => r.data))
		), options);
		await this.flushCache(path, options);
		return result;
	}

	async delete<Out = unknown>(path?: string, config?: AxiosRequestConfig, options?: RestClientOptions<never>) {
		const result = await firstValueFrom(
			this.httpService.delete<Out>(this.getHostAndPath(path), this.getRequestConfig(config))
				.pipe(map(r => r.data))
		);
		await this.flushCache(path, options);
		return result;
	}

	async flushCache(path?: string, options?: RestClientOptions<unknown>) {
		const cache = this.getCacheConf(options);
		if (!cache) {
			return;
		}
		if (isCacheOptionsObject(cache) && cache.singleResourceEndpoint) {
			await this.cache!.del(this.getHostAndPath());
		}
		await this.cache!.del(this.getHostAndPath(path));
	}
}
