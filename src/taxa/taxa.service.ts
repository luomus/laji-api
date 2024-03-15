import { HttpException, Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";
import { Taxon } from "./taxa.dto";
import { TAXA_CLIENT } from "src/provider-tokens";

type QueryResponse = {
	matches: Taxon[];
}

@Injectable()
export class TaxaService {
	constructor(
		@Inject(TAXA_CLIENT) private taxaClient: RestClientService<Taxon>) {}

	async get(id: string): Promise<Taxon> {
		const { matches } = (await this.taxaClient.get<QueryResponse>("", { params: { q: id } }));
		if (!matches || matches?.length < 1) {
			throw new HttpException("Taxon not found", 404);
		}
		matches[0]["@context"] = "http://tun.fi/MX.taxon";
		return matches[0];
	}
}
