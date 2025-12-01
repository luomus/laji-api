import { InformationSystem } from "@luomus/laji-schema/models";
import { HttpException, Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { IntelligentInMemoryCache } from "src/decorators/intelligent-in-memory-cache.decorator";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { CACHE_30_MIN, dictionarifyByKey } from "src/utils";

@Injectable()
@IntelligentInMemoryCache()
export class SourcesService {
	constructor(
		private triplestoreService: TriplestoreService
	) { }

	@Interval(CACHE_30_MIN)
	async warmup() {
		await this.getAllDict();
	}


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
			{ type: "KE.informationSystem", predicate: "KE.isWarehouseSource", objectliteral: "true" },
			{ cache: CACHE_30_MIN }
		);
	}
}
