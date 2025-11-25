import { Inject, Injectable } from "@nestjs/common";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { CACHE_30_MIN } from "src/utils";

@Injectable()
export class RedListEvaluationGroupsService {
	constructor(
		@Inject("TRIPLESTORE_READONLY_SERVICE") private triplestoreService: TriplestoreService,
	) { }

	get(id: string) {
		return this.triplestoreService.get(id, { cache: CACHE_30_MIN }, "MVL.iucnRedListTaxonGroup");
	}
}
