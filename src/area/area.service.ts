import { Inject, Injectable } from "@nestjs/common";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { CACHE_30_MIN, dictionarifyByKey } from "src/utils";
import { Interval } from "@nestjs/schedule";
import { Area } from "./area.dto";
import { Memoize } from "../decorators/memoize.decorator";
import { WarmupCache } from "src/decorators/warm-up-cache.decorator";

@Injectable()
@WarmupCache()
export class AreaService {

	constructor(
		@Inject("TRIPLESTORE_READONLY_SERVICE") private triplestoreService: TriplestoreService,
	) { }

	@Interval(CACHE_30_MIN)
	async warmup() {
		await this.getAllDict();
	}

	private getAll() {
		return this.triplestoreService.find<Area>({ type: "ML.area" }, { cache: CACHE_30_MIN });
	}

	@Memoize()
	async getAllDict(): Promise<Record<string, Area>> {
		return dictionarifyByKey(await this.getAll(), "id");
	}

	@Memoize()
	async getDictByType(type: Area["areaType"]) {
		return dictionarifyByKey((await this.getAll()).filter(area => area.areaType === type), "id");
	}
}
