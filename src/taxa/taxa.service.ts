import { HttpException, Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";
import { Taxon } from "./taxa.dto";
import { TAXA_CLIENT } from "src/provider-tokens";
import { JSONObjectSerializable, MaybeArray } from "src/type-utils";
import { asArray } from "src/utils";

type QueryResponse = {
	matches: Taxon[];
}

@Injectable()
export class TaxaService {
	constructor(@Inject(TAXA_CLIENT) private taxaClient: RestClientService<Taxon>) {}

	async get(id: string, selectedFields?: MaybeArray<string>): Promise<Taxon> {
		const query: JSONObjectSerializable = { q: id };
		if (selectedFields) {
			query.selectedFields = asArray(selectedFields).join(",");
		}
		const { matches } = (await this.taxaClient.get<QueryResponse>("", { params: query }));
		const [match] = matches;
		if (!match) {
			throw new HttpException("Taxon not found", 404);
		}
		return match;
	}
}
