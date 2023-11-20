import { HttpService } from "@nestjs/axios";
import { Inject, Injectable } from "@nestjs/common";
import { AxiosRequestConfig } from "axios";
import { firstValueFrom } from "rxjs";
import { map } from "rxjs/operators";
import { Newable, serializeInto } from "src/type-utils";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { CacheOptions } from "src/utils";

export interface RestClientConfig {
	path: string;
	auth?: string;
}

export type LajiApiOptions<T> = {
	/** A class that that the result will be serialized into. */
	serializeInto?: Newable<T>;
} & CacheOptions;

/**
 * Abstract wrapper for a service that connects to a remote REST API.
 * The implementing service can "provide (nestTM)" this service and fill in the REST_CLIENT_CONFIG.
 */
@Injectable()
export class RestClientService<T = any> {
	private path: string;
	private auth: string | undefined;

	constructor(
		private readonly httpService: HttpService,
		@Inject("REST_CLIENT_CONFIG") private readonly config: RestClientConfig,
		@Inject(CACHE_MANAGER) private readonly cache: Cache
	) {
		this.path = this.config.path;
		if (this.config.auth) {
			this.auth = this.config.auth;
		}
	}

	private getOptions(options: AxiosRequestConfig = {}) {
		if (!this.auth) {
			return options;
		}
		return { ...options, headers: { Authorization: this.auth, ...(options.headers || {}) } };
	}

	private getPath(path?: string) {
		if (path === undefined) {
			return this.path;
		}
		return `${this.path}/${path}`;
	}

	static applyOptions<T>(item: T, lajiApiOptions?: LajiApiOptions<T>): T {
		return lajiApiOptions?.serializeInto
			? serializeInto(lajiApiOptions.serializeInto)(item)
			: item;
	}

	private getCacheKey(path?: string, options?: AxiosRequestConfig) {
		return this.getPath(path) + JSON.stringify(options?.params)
	}

	private async getWithCache<S>(path?: string, options?: AxiosRequestConfig, lajiApiOptions?: LajiApiOptions<S>)
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
		if (lajiApiOptions?.cache) {
			cachedByPath = await this.cache.get<Record<string, S>>(this.getPath(path))
				|| {} as Record<string, S>;
			const cached = this.getCacheKey(path, options) in cachedByPath
				? cachedByPath[this.getCacheKey(path, options)]
				: undefined;
			if (cached) {
				return cached;
			}
		}
		const result = await firstValueFrom(
			this.httpService.get<S>(this.getPath(path), this.getOptions(options)).pipe(map(r => r.data))
		);
		if (lajiApiOptions?.cache) {
			/* eslint-disable @typescript-eslint/no-non-null-assertion */
			cachedByPath![this.getCacheKey(path, options)] = result;
			await this.cache.set(this.getPath(path),
				cachedByPath!,
				lajiApiOptions.cache);
			/* eslint-enable @typescript-eslint/no-non-null-assertion */
		}
		return result;
	}

	get = async <S = T>(path?: string, options?: AxiosRequestConfig, lajiApiOptions?: LajiApiOptions<S>) =>
		RestClientService.applyOptions<S>(await this.getWithCache<S>(path, options, lajiApiOptions), lajiApiOptions);

	async post<S = T>(
		path?: string,
		body?: S, options?: AxiosRequestConfig,
		lajiApiOptions?: LajiApiOptions<S>
	) {
		await this.cache.del(this.getPath(path));
		return RestClientService.applyOptions(await firstValueFrom(
			this.httpService.post<S>(this.getPath(path), body, this.getOptions(options)).pipe(map(r => r.data))
		), lajiApiOptions);
	}

	async put<S = T>(
		path?: string,
		body?: S,
		options?: AxiosRequestConfig,
		lajiApiOptions?: LajiApiOptions<S>
	) {
		await this.cache.del(this.getPath(path));
		return RestClientService.applyOptions(await firstValueFrom(
			this.httpService.put<S>(this.getPath(path), body, this.getOptions(options)).pipe(map(r => r.data))
		), lajiApiOptions);
	}

	async delete(path?: string, options?: AxiosRequestConfig) {
		await this.cache.del(this.getPath(path));
		return firstValueFrom(
			this.httpService.delete(this.getPath(path), this.getOptions(options)).pipe(map(r => r.data))
		);
	}
}
