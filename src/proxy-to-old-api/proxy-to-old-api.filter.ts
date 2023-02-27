import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from "@nestjs/common";
import { Request, Response } from "express";
import {ProxyToOldApiService} from "./proxy-to-old-api.service";

const OLD_API = "http://localhost:3003";

@Catch()
export class ProxyToOldApiFilter implements ExceptionFilter {
	constructor(
		private readonly proxyToOldApiService: ProxyToOldApiService) {
	}

	async catch(exception: NotFoundException, host: ArgumentsHost) {
		const request = host.switchToHttp().getRequest<Request>();
		console.log('caught', request.url);
		const response = host.switchToHttp().getResponse<Response>();
		this.proxyToOldApiService.redirectToOldApi(request, response);
	}
}
