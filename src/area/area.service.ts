import { HttpException, Inject, Injectable } from "@nestjs/common";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { CACHE_30_MIN, dictionarifyByKey } from "src/utils";
import { Interval } from "@nestjs/schedule";
import { Area, AreaTypeDto } from "./area.dto";
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
		await this.getIdToArea();
	}

	async find(areaType?: AreaTypeDto, ids?: string[]) {
		const all = await this.getAll();
		if (!ids?.length && !areaType) {
			return all;
		}
		return all.filter(a => (!areaType || a.areaType === areaType) && (!ids || ids.includes(a.id)));
	}

	async get(id: string) {
		const area = (await this.getIdToArea())[id];
		if (!area) {
			throw new HttpException("Area not found", 404);
		}
		return area;
	}

	@IntelligentMemoize()
	private async getAll() {
		return this.triplestoreService.find<Area>({ type: "ML.area" }, { cache: CACHE_TTL });
	}

	@IntelligentMemoize()
	async getIdToArea(): Promise<Record<string, Area>> {
		return dictionarifyByKey(await this.getAll(), "id");
	}

	@IntelligentMemoize()
	async getDictByType(type: Area["areaType"]) {
		return dictionarifyByKey((await this.getAll()).filter(area => area.areaType === type), "id");
	}
}
