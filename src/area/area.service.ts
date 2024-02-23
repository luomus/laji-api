import { Inject, Injectable } from "@nestjs/common";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { CACHE_30_MIN, dictionarifyByKey } from "src/utils";
import { Interval } from "@nestjs/schedule";
import { Area } from "./area.dto";
import { IntelligentMemoize } from "../decorators/intelligent-memoize.decorator";
import { IntelligentInMemoryCache } from "src/decorators/intelligent-in-memory-cache.decorator";

const CACHE_TTL = CACHE_30_MIN;

@Injectable()
@IntelligentInMemoryCache()
export class AreaService {

	constructor(
		@Inject("TRIPLESTORE_READONLY_SERVICE") private triplestoreService: TriplestoreService,
	) { }

	@Interval(CACHE_TTL)
	async warmup() {
		await this.getAllDict();
	}

	private getAll() {
		return this.triplestoreService.find<Area>({ type: "ML.area" }, { cache: CACHE_TTL });
	}

	@IntelligentMemoize()
	async getAllDict(): Promise<Record<string, Area>> {
		return dictionarifyByKey(await this.getAll(), "id");
	}

	@IntelligentMemoize()
	async getDictByType(type: Area["areaType"]) {
		return dictionarifyByKey((await this.getAll()).filter(area => area.areaType === type), "id");
	}
}
