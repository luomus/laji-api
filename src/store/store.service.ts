import { Inject, Injectable } from "@nestjs/common";
import { Observable, of } from "rxjs";
import { RestClientService }  from "src/rest-client/rest-client.service";
import { JSONObject } from "src/type-utils";

type StoreQueryResult<T> = {
	member: T[];
}

@Injectable()
export class StoreService {

	constructor(
		@Inject("STORE_REST_CLIENT") private storeClient: RestClientService) {}

	query<T>(resource: string, query: string, page = 1, pageSize = 20) {
		return this.storeClient.get<StoreQueryResult<T>>(resource, { params: { q: query, page, page_size: pageSize } });
	}

	create<T>(resource: string, item: Partial<T>) {
		return of(item as T);
		// return this.storeClient.post<Partial<T>>(resource, item) as Observable<T>;
	}
}
