import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from "@nestjs/common";
import { Request, Response } from "express";
import {ProxyToOldApiService} from "./proxy-to-old-api.service";

@Catch()
export class ProxyToOldApiFilter implements ExceptionFilter {
	constructor(
		private readonly proxyToOldApiService: ProxyToOldApiService) {
	}

	async catch(exception: NotFoundException, host: ArgumentsHost) {
		const request = host.switchToHttp().getRequest<Request>();
		const response = host.switchToHttp().getResponse<Response>();
		this.proxyToOldApiService.redirectToOldApi(request, response);
	}
}
