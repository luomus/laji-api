import { HttpService } from "@nestjs/axios";
import { Injectable } from '@nestjs/common';
import { HttpAdapterHost } from "@nestjs/core";
import {firstValueFrom, Observable} from "rxjs";
import { AxiosError, AxiosResponse } from "axios";
import * as rawBody from "raw-body";
import { Request, Response } from "express";

const OLD_API = "http://localhost:3003";

@Injectable()
export class ProxyToOldApiService {
	constructor(
		private readonly httpService: HttpService,
		private readonly httpAdapterHost: HttpAdapterHost) {
	}

	async redirectToOldApi(request: Request, response: Response) {
		const method = request.method.toLowerCase();
		const body = rawBody(request).toString();
		try {
			let oldApiRequest$!: Observable<AxiosResponse>;
			const oldApiRequestUrl = OLD_API + request.path;
			const oldApiRequestOptions =  {headers: request.headers, params: request.query};
			if (method === "get" || method === "delete") {
				oldApiRequest$ = this.httpService[method](oldApiRequestUrl, oldApiRequestOptions);
			} else if (method === "put" || method === "post" || method === "patch") {
				oldApiRequest$ = this.httpService[method](oldApiRequestUrl, body, oldApiRequestOptions);
			}
			const apiResponse = await firstValueFrom(oldApiRequest$);
			// response = mutablyCopyHeaders(apiResponse, response);
			this.httpAdapterHost.httpAdapter.reply(response, apiResponse.data, apiResponse.status);
		} catch (e) {
			if (e instanceof AxiosError) {
				this.httpAdapterHost.httpAdapter.reply(response, e.response?.data, e.response?.status || 500);
			} else {
				throw e;
			}
		}
	}
}


// Do mutably in order to prevent copying the request.
function mutablyCopyHeaders(from: AxiosResponse, to: Response) {
	// const keys = Object.keys(from.headers);
	const keys = ["content-type"];
	for (const key of keys) {
		// console.log(key, from.headers[key]);
		console.log("set", key, from.headers[key]);
		to = to.header(key, from.headers[key]);
	}
	return to
}
