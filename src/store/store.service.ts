import { Inject, Injectable } from "@nestjs/common";
import { RestClientService }  from "src/rest-client/rest-client.service";

type StoreQueryResult<T> = {
	member: T[];
}

@Injectable()
export class StoreService {

	constructor(
		@Inject("STORE_REST_CLIENT") private storeClient: RestClientService) {}

	query<T>(resource: string, query: string, page = 1, pageSize = 20) {
		console.log("query", resource, query);
		return this.storeClient.get<StoreQueryResult<T>>(resource, { params: { q: query, page, page_size: pageSize } });
	}
}
