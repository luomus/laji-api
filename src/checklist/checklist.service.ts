import { HttpException, Inject, Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { IntelligentInMemoryCache } from "src/decorators/intelligent-in-memory-cache.decorator";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { CACHE_30_MIN, dictionarifyByKey } from "src/utils";
import { Checklist } from "./checklist.dto";

@Injectable()
@IntelligentInMemoryCache()
export class ChecklistService {
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
		const checklist = (await this.getAllDict())[id];
		if (!checklist) {
			throw new HttpException("Checklist not found", 404);
		}
		return checklist;
	}

	@IntelligentMemoize()
	private async getAll() {
		return (await this.triplestoreService.find<Checklist>({
			type: "MR.checklist",
			predicate: "MR.isPublic",
			objectliteral: true
		}, { cache: CACHE_30_MIN })).map(checklist => {
			// In the checklist data from triplestore, it uses dct: prefix instead of dc for some reason...
			const badlyNamedBibliographicCitation = (checklist as any)["dct:bibliographicCitation"];
			if (badlyNamedBibliographicCitation) {
				checklist["dc:bibliographicCitation"] = badlyNamedBibliographicCitation;
			}
			delete (checklist as any)["dct:bibliographicCitation"];
			return checklist;
		});
	}

	@IntelligentMemoize()
	async getAllDict(): Promise<Record<string, Checklist>> {
		return dictionarifyByKey(await this.getAll(), "id");
	}
}
