import { InformationSystem } from "@luomus/laji-schema/models";
import { HttpException, Injectable } from "@nestjs/common";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { CACHE_30_MIN, dictionarifyByKey } from "src/utils";

@Injectable()
export class SourcesService {
	constructor(
		private triplestoreService: TriplestoreService
	) { }


	async find(ids?: string[]) {
		if (!ids) {
			return this.getAll();
		}
		const dict = await this.getAllDict();
		return (ids || []).map(id => dict[id]!).filter(Boolean);
	}

	async get(id: string) {
		const source = (await this.getAllDict())[id];
		if (!source) {
			throw new HttpException("Source not found", 404);
		}
		return source;
	}

	@IntelligentMemoize()
	async getAllDict() {
		return dictionarifyByKey(await this.getAll(), "id");
	}

	@IntelligentMemoize()
	private async getAll() {
		return this.triplestoreService.find<InformationSystem>(
			{ type: "KE.informationSystem" }, { cache: CACHE_30_MIN }
		);
	}
}
