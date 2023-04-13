import { HttpService } from "@nestjs/axios";
import { Inject, Injectable } from "@nestjs/common";
import { AxiosRequestConfig } from "axios";
import { firstValueFrom } from "rxjs";
import { map } from "rxjs/operators";
import { Newable, serializeInto } from "src/type-utils";

export interface RestClientConfig {
	path: string;
	auth?: string;
}


export type LajiApiOptions<T> = {
	serializeInto?: Newable<T>;
}

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
		@Inject("REST_CLIENT_CONFIG") private readonly config: RestClientConfig) {
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

	static applyOptions<T>(item: T, lajiApiOptions?: LajiApiOptions<T>) {
		return lajiApiOptions?.serializeInto
			? serializeInto(lajiApiOptions.serializeInto)(item)
			: item;
	}

	get = async <S = T>(path?: string, options?: AxiosRequestConfig, lajiApiOptions?: LajiApiOptions<S>) =>
		RestClientService.applyOptions(await firstValueFrom(
			this.httpService.get<S>(this.getPath(path), this.getOptions(options)).pipe(map(r => r.data))
		), lajiApiOptions);

	async post<S = T>(
		path?: string,
		body?: S, options?: AxiosRequestConfig,
		lajiApiOptions?: LajiApiOptions<S>
	) {
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
		return RestClientService.applyOptions(await firstValueFrom(
			this.httpService.put<S>(this.getPath(path), body, this.getOptions(options)).pipe(map(r => r.data))
		), lajiApiOptions);
	}

	delete(path?: string, options?: AxiosRequestConfig) {
		return firstValueFrom(
			this.httpService.delete(this.getPath(path), this.getOptions(options)).pipe(map(r => r.data))
		);
	}
}
