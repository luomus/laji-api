import { HttpService } from "@nestjs/axios";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { AxiosRequestConfig } from "axios";
import { firstValueFrom, Observable } from "rxjs";
import { catchError, map } from "rxjs/operators";

export interface RestClientConfig {
	path: string;
	auth?: string;
}

/*
 * Abstract wrapper for a service that connects to a remote REST API.
 * The implementing service can provide (nestTM) this service and fill in the REST_CLIENT_CONFIG.
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

	get<S = T>(path?: string, options?: AxiosRequestConfig) {
		return firstValueFrom(
			this.httpService.get<S>(this.getPath(path), this.getOptions(options)).pipe(map(r => r.data))
		);
	}

	post<S = T>(path?: string, body?: S, options?: AxiosRequestConfig) {
		return firstValueFrom(
			this.httpService.post<S>(this.getPath(path), body, this.getOptions(options)).pipe(map(r => r.data))
		);
	}

	put<S = T>(path?: string, body?: S, options?: AxiosRequestConfig) {
		return firstValueFrom(
			this.httpService.put<S>(this.getPath(path), body, this.getOptions(options)).pipe(map(r => r.data))
		);
	}

	delete(path?: string, options?: AxiosRequestConfig) {
		return firstValueFrom(
			this.httpService.delete(this.getPath(path), this.getOptions(options)).pipe(map(r => r.data))
		);
	}
}

/*
 * Catches AxiosErrors where the request fails due to a error response, and rethrow it as an HttpException.
 * If the error isn't a AxiosError with a response, just rethrows.
 */
export const clientErrorToHttpException = (e: any) => {
	if (e instanceof HttpException || !e.response) {
		throw e;
	}
	if (!e.response) {
		throw e;
	}
	throw new HttpException(e.response?.data, e.response?.status || 500)
};
