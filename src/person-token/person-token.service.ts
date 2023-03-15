import { Inject, Injectable } from "@nestjs/common";
import { map, Observable, switchMap } from "rxjs";
import { RestClientService, rethrowHttpException } from "src/rest-client/rest-client.service";
import { LajiAuthPersonGet, PersonTokenInfo } from "./person-token.dto";

@Injectable()
export class PersonTokenService {
	
	constructor(@Inject("LAJI_AUTH_REST_CLIENT") private lajiAuthClient: RestClientService<LajiAuthPersonGet>) {}

	getInfo(personToken: string): Observable<PersonTokenInfo> {
		return this.lajiAuthClient.get(`token/${personToken}`).pipe(
			rethrowHttpException(),
			map(info => ({
				personId: info.user.qname,
				target: info.target,
				next: info.next,
			})));
	}

	delete(personToken: string) {
		return this.getInfo(personToken).pipe(
			switchMap(() => this.lajiAuthClient.delete(`token/${personToken}`)),
			rethrowHttpException());
	}
}
