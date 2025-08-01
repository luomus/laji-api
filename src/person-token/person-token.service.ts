import { HttpException, Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";
import { LajiAuthPersonGet, PersonTokenInfo } from "./person-token.dto";
import { CACHE_1_SEC } from "src/utils";
import { LAJI_AUTH_CLIENT } from "src/provider-tokens";

@Injectable()
export class PersonTokenService {

	constructor(
		@Inject(LAJI_AUTH_CLIENT) private lajiAuthClient: RestClientService<LajiAuthPersonGet>
	) {}

	async getInfo(personToken: string): Promise<PersonTokenInfo> {
		const info = await this.lajiAuthClient.get(`token/${personToken}`, undefined, { cache: 10 * CACHE_1_SEC });
		return {
			personId: info.user.qname,
			target: info.target,
			next: info.next,
		};
	}

	async getPersonIdFromToken(personToken: string): Promise<string> {
		const { personId } = await this.getInfo(personToken);
		if (!personId) {
			throw new HttpException("No personId found for personToken", 404);
		}
		return personId;
	}

	async delete(personToken: string) {
		return this.lajiAuthClient.delete(`token/${personToken}`);
	}
}
