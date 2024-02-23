import { HttpService } from "@nestjs/axios";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { AxiosRequestConfig } from "axios";
import { firstValueFrom } from "rxjs";
import { map } from "rxjs/operators";
import { Newable } from "src/type-utils";
import { serializeInto } from "src/serializing/serializing";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { CacheOptions } from "src/utils";

export type RestClientConfig<T = never> = RestClientOptions<T> & {
	path: string;
	auth?: string;
}

export type RestClientOptions<T> = {
	/** A class that that the result will be serialized into. */
	serializeInto?: Newable<T>;
} & CacheOptions;

/**
 * Abstract wrapper for a service that connects to a remote REST API.
 * The implementing service can "provide (nestTM)" this service and fill in the REST_CLIENT_CONFIG.
 *
 * Enables caching based on the assumption that it's a REST API; GET responses are cached, until a
 * POST, PUT or DELETE is made to the same path.
 */
@Injectable()
export class RestClientService<T = unknown> {
	private path: string;
	private auth: string | undefined;

	private logger = new Logger(RestClientService.name);

	constructor(
		private readonly httpService: HttpService,
		@Inject("REST_CLIENT_CONFIG") private readonly config: RestClientConfig<T>,
		@Inject(CACHE_MANAGER) private readonly cache: Cache
	) {
		this.path = this.config.path;
		if (this.config.auth) {
			this.auth = this.config.auth;
		}
	}

	private getRequesconfig(config: AxiosRequestConfig = {}) {
		if (!this.auth) {
			return config;
		}
		return { ...config, headers: { Authorization: this.auth, ...(config.headers || {}) } };
	}

	private getPath(path?: string) {
		if (path === undefined) {
			return this.path;
		}
		return `${this.path}/${path}`;
	}

	static applyOptions<T>(item: T, options?: RestClientOptions<T>): T {
		return options?.serializeInto
			? serializeInto(options.serializeInto)(item)
			: item;
	}

	private getPathAndQuery(path?: string, config?: AxiosRequestConfig) {
		const query = new URLSearchParams(config?.params).toString();
		return this.getPath(path) + (query ? `?${query}` : "");
	}

	private async getWithCache<S>(path?: string, config?: AxiosRequestConfig, options?: RestClientOptions<S>)
	: Promise<S> {
		// We cache a map where keys are the path without query params, and the keys are the full uri with path and query params.
		// This way we can bust the cache by just the path.
		//
		// Example for cachedByPath, where this.path = "https://foo.bar/path", path = "path":
		// { "https://foo.bar/path": {
		// "https://foo.bar/path?param1=foo": "cached example value 1",
		// "https://foo.bar/path?param2=bar": "cached example value 2",
		// } }
		let cachedByPath: Record<string, S>;
		const pathAndQuery = this.getPathAndQuery(path, config);
		if (options?.cache) {
			cachedByPath = await this.cache.get<Record<string, S>>(this.getPath(path))
				|| {} as Record<string, S>;
			const cached = pathAndQuery in cachedByPath
				? cachedByPath[pathAndQuery]
				: undefined;
			if (cached) {
				this.logger.verbose(`Cache hit for ${pathAndQuery}`);
				return cached;
			}
		}
		this.logger.verbose(`GET ${pathAndQuery}`);
		const result = await firstValueFrom(
			this.httpService.get<S>(this.getPath(path), this.getRequesconfig(config)).pipe(map(r => r.data))
		);
		if (options?.cache) {
			/* eslint-disable @typescript-eslint/no-non-null-assertion */
			cachedByPath![pathAndQuery] = result;
			await this.cache.set(this.getPath(path),
				cachedByPath!,
				typeof options.cache === "number" ? options.cache : undefined);
			/* eslint-enable @typescript-eslint/no-non-null-assertion */
		}
		return result;
	}

	get = async <S = T>(path?: string, config?: AxiosRequestConfig, options?: RestClientOptions<S>) =>
		RestClientService.applyOptions<S>(await this.getWithCache<S>(path, config, options), options);

	async post<S = T, R = T>(
		path?: string,
		body?: R, config?: AxiosRequestConfig,
		options?: RestClientOptions<S>
	) {
		options?.cache && await this.cache.del(this.getPath(path));
		return RestClientService.applyOptions(await firstValueFrom(
			this.httpService.post<S>(this.getPath(path), body, this.getRequesconfig(config)).pipe(map(r => r.data))
		), options);
	}

	async put<S = T, R = T>(
		path?: string,
		body?: R,
		config?: AxiosRequestConfig,
		options?: RestClientOptions<S>
	) {
		options?.cache && await this.cache.del(this.getPath(path));
		return RestClientService.applyOptions(await firstValueFrom(
			this.httpService.put<S>(this.getPath(path), body, this.getRequesconfig(config)).pipe(map(r => r.data))
		), options);
	}

	async delete(path?: string, config?: AxiosRequestConfig, options?: RestClientOptions<never>) {
		options?.cache && await this.cache.del(this.getPath(path));
		return firstValueFrom(
			this.httpService.delete(this.getPath(path), this.getRequesconfig(config)).pipe(map(r => r.data))
		);
	}
}
