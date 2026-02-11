import { ArgumentsHost, Catch, NotFoundException } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { ProxyToOldApiService } from "./proxy-to-old-api.service";
import { BaseExceptionFilter } from "@nestjs/core";

@Catch(NotFoundException)
export class ProxyToOldApiFilter extends BaseExceptionFilter {
	constructor(private readonly proxyToOldApiService: ProxyToOldApiService) {
		super();
	}

	async catch(exception: NotFoundException, host: ArgumentsHost) {
		const request = host.switchToHttp().getRequest<Request>();

		if (request.headers["api-version"] === "1") {
			super.catch(exception, host);
			return;
		}

		const response = host.switchToHttp().getResponse<Response>();
		const next = host.switchToHttp().getNext<NextFunction>();
		void this.proxyToOldApiService.redirectToOldApi(request, response, next);
	}
}
