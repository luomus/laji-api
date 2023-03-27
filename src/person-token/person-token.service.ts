import { Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";
import { LajiAuthPersonGet, PersonTokenInfo } from "./person-token.dto";

@Injectable()
export class PersonTokenService {
	
	constructor(@Inject("LAJI_AUTH_REST_CLIENT") private lajiAuthClient: RestClientService<LajiAuthPersonGet>) {}

	async getInfo(personToken: string): Promise<PersonTokenInfo> {
		const info = await this.lajiAuthClient.get(`token/${personToken}`);
		return {
			personId: info.user.qname,
			target: info.target,
			next: info.next,
		}
	}

	async delete(personToken: string) {
		await this.getInfo(personToken);
		return this.lajiAuthClient.delete(`token/${personToken}`);
	}
}
