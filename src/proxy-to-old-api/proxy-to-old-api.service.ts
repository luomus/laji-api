import { Injectable } from "@nestjs/common";
import { Request, Response } from "express";
import * as _request from "request";

const OLD_API = "http://localhost:3003/v0";

@Injectable()
export class ProxyToOldApiService {
	async redirectToOldApi(request: Request, response: Response) {
		// Taken from https://stackoverflow.com/a/62289124
		const method = request.method.toLowerCase();
		const oldApiRequestUrl = OLD_API + request.path;
		const redirectedRequest = _request({
			uri: oldApiRequestUrl,
			qs: request.query,
			headers: request.header,
			method: method.toUpperCase(),
			json: request.readable ? false: true,
			body: request.readable ? undefined : request.body
		});
		if (request.readable) {
			// Handles all the streamable data (e.g. image uploads)
			request.pipe(redirectedRequest).pipe(response);
		} else {
			// Handles everything else
			redirectedRequest.pipe(response);
		}
	}
}
