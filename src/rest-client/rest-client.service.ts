import { HttpService } from "@nestjs/axios";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { AxiosRequestConfig } from "axios";
import { firstValueFrom } from "rxjs";
import { map } from "rxjs/operators";
import { JSONObjectSerializable, Newable } from "src/type-utils";
import { serializeInto } from "src/serializing/serializing";
import { CacheOptions } from "src/utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

export type RestClientConfig<T> = RestClientOptions<T> & {
	/** Used for logging purposes */
	name: string;
	host?: string;
	auth?: string;
	headers?: Record<string, string | undefined>;
	params?: JSONObjectSerializable;
};

export type RestClientOptions<T> = Partial<HasMaybeSerializeInto<T>> & CacheOptions & {
	/**
	 * Perform a transformation for the resource fetched with a GET request. Useful for making transformations before
	 * caching.
	 */
	transformer?: (result: T) => T;
};

export type HasMaybeSerializeInto<T> = {
	/** A class that that the result will be serialized into. */
	serializeInto?: Newable<T>;
}

const joinOverflowWithRight = (str: string, str2: string) =>
	str.length + str2.length > 24
		? str.substr(0, 19 - str2.length) + ".../" + str2
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

	private logger = new Logger(joinOverflowWithRight(RestClientService.name, this.config.name));

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

	static applyOptions<T>(item: T, options?: RestClientOptions<T>): T {
		return options?.serializeInto
			? serializeInto(options.serializeInto)(item)
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
		// Example for cachedByPath, where this.path = "https://foo.bar/path", path = "path":
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
				this.logger.verbose(`GET (CACHED) ${url}`);
				return cached;
			}
		}
		this.logger.verbose(`GET ${url}`);
		let result: S;
		try {
			result = await firstValueFrom(
				this.httpService.get<S>(this.getHostAndPath(path), this.getRequestConfig(config)).pipe(map(r =>
					options?.transformer ? options.transformer(r.data) : r.data
				))
			);
		} catch (e) {
			this.logger.verbose(`GET FAILED FOR ${url}`);
			throw e;
		}
		const cacheConf = this.getCacheConf(options);
		if (cacheConf) {
			/* eslint-disable @typescript-eslint/no-non-null-assertion */
			cachedByHostAndPath![url] = result;
			await this.cache!.set(this.getHostAndPath(path),
				cachedByHostAndPath!,
				typeof cacheConf === "number" ? cacheConf : undefined);
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
		const url = this.getURL(path, this.getRequestConfig(config));
		this.logger.verbose(`POST ${url}`);
		let result: Out;
		try {
			result = RestClientService.applyOptions(await firstValueFrom(
				this.httpService.post<Out>(this.getHostAndPath(path), body, this.getRequestConfig(config))
					.pipe(map(r => r.data))
			), options);
		} catch (e) {
			this.logger.verbose(`POST FAILED FOR ${url}`);
			throw e;
		}
		this.getCacheConf(options) && await this.cache!.del(this.getHostAndPath(path));
		return result;
	}

	async put<Out = T, In = T>(
		path?: string,
		body?: In,
		config?: AxiosRequestConfig,
		options?: RestClientOptions<Out>
	) {
		const url = this.getURL(path, this.getRequestConfig(config));
		this.logger.verbose(`PUT ${url}`);
		let result: Out;
		try {
			result = RestClientService.applyOptions(await firstValueFrom(
				this.httpService.put<Out>(this.getHostAndPath(path), body, this.getRequestConfig(config))
					.pipe(map(r => r.data))
			), options);
		} catch (e) {
			this.logger.verbose(`PUT FAILED FOR ${url}`);
			throw e;
		}
		this.getCacheConf(options) && await this.cache!.del(this.getHostAndPath(path));
		return result;
	}

	async delete<Out = unknown>(path?: string, config?: AxiosRequestConfig, options?: RestClientOptions<never>) {
		const url = this.getURL(path, this.getRequestConfig(config));
		this.logger.verbose(`DELETE ${url}`);
		let result: Out;
		try {
			result = await firstValueFrom(
				this.httpService.delete<Out>(this.getHostAndPath(path), this.getRequestConfig(config))
					.pipe(map(r => r.data))
			);
		} catch (e) {
			this.logger.verbose(`DELETE FAILED FOR ${url}`);
			throw e;
		}
		this.getCacheConf(options) && await this.cache!.del(this.getHostAndPath(path));
		return result;
	}
}
