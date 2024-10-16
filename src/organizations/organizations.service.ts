import { Organization } from "@luomus/laji-schema";
import { HttpException, Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { IntelligentInMemoryCache } from "src/decorators/intelligent-in-memory-cache.decorator";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { RemoteContextual } from "src/typing.utils";
import { CACHE_1_H, dictionarifyByKey } from "src/utils";

@Injectable()
@IntelligentInMemoryCache()
export class OrganizationsService {

	constructor(private triplestoreService: TriplestoreService) { }

	@Interval(CACHE_1_H)
	async warmup() {
		await this.getAllDict();
	}

	async get(id: string) {
		const organization = (await this.getAllDict())[id];
		if (!organization) {
			throw new HttpException("Organization not found", 404);
		}
		return organization;
	}

	@IntelligentMemoize()
	private async getAll() {
		return this.triplestoreService.find<Organization>({ type: "MOS.organization" });
	}

	@IntelligentMemoize()
	async getAllDict(): Promise<Record<string, RemoteContextual<Organization>>> {
		return dictionarifyByKey(await this.getAll(), "id");
	}
}
