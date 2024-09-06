import { HttpException, Inject, Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { IntelligentInMemoryCache } from "src/decorators/intelligent-in-memory-cache.decorator";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { CACHE_30_MIN, dictionarifyByKey } from "src/utils";
import { ChecklistVersion } from "./checklist-versions.dto";

@Injectable()
@IntelligentInMemoryCache()
export class ChecklistVersionsService {
	constructor(
		@Inject("TRIPLESTORE_READONLY_SERVICE") private triplestoreService: TriplestoreService,
	) { }

	@Interval(CACHE_30_MIN)
	async warmup() {
		await this.getAllDict();
	}

	async find(ids?: string[]) {
		const all = await this.getAll();
		if (!ids?.length) {
			return all;
		}
		return all.filter(c => ids.includes(c.id));
	}

	async get(id: string) {
		const checklistVersion = (await this.getAllDict())[id];
		if (!checklistVersion) {
			throw new HttpException("Checklist version not found", 404);
		}
		return checklistVersion;
	}

	@IntelligentMemoize()
	private getAll() {
		return this.triplestoreService.find<ChecklistVersion>({
			type: "MR.checklistVersion",
		});
	}

	@IntelligentMemoize()
	async getAllDict(): Promise<Record<string, ChecklistVersion>> {
		return dictionarifyByKey(await this.getAll(), "id");
	}
}
