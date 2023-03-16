import { Inject, Injectable } from "@nestjs/common";
import {tap} from "rxjs";
import {RestClientService} from "src/rest-client/rest-client.service";

@Injectable()
export class TriplestoreService {
	constructor(
		@Inject("TRIPLESTORE_REST_CLIENT") private triplestoreClient: RestClientService) {}

	get(resource: string) {
		return this.triplestoreClient.get(resource, { params: { format: "json" } }).pipe(tap(v => console.log(v)))
	}

}
