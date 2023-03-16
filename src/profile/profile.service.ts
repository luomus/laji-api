import { Inject, Injectable } from "@nestjs/common";
import { RestClientService, rethrowHttpException } from "src/rest-client/rest-client.service";

@Injectable()
export class ProfileService {
	constructor(
		@Inject("STORE_REST_CLIENT") private storeClient: RestClientService) {}

	getProfileByPersonId(personId: string) {
		return this.storeClient.get(`profile/${personId}`).pipe(rethrowHttpException());
	}
}
