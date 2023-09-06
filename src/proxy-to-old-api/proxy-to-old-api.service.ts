import { Injectable } from "@nestjs/common";
import { Request, Response } from "express";
import * as _request from "request";

const OLD_API = "http://localhost:3003/v0";

@Injectable()
export class ProxyToOldApiService {
	async redirectToOldApi(request: Request, response: Response) {
		// Taken from https://stackoverflow.com/a/62289124
		const oldApiRequestUrl = OLD_API + request.path;
		const redirectedRequest = _request({
			uri: oldApiRequestUrl,
			method: request.method,
			body: request.readable
				? undefined
				: typeof request.body == "string" // fix https://github.com/request/request/issues/3343
					? JSON.parse(request.body)
					: request.body,
			headers: request.headers,
			json: request.readable ? false : true,
			qs: request.query,
			// Pass redirect back to the browser
			followRedirect: false
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
