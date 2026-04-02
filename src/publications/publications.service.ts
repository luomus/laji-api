import { Inject, Injectable } from "@nestjs/common";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { MS_30_MIN } from "src/utils";

@Injectable()
export class PublicationsService {
	constructor(
		@Inject("TRIPLESTORE_READONLY_SERVICE") private triplestoreService: TriplestoreService,
	) { }

	get(id: string) {
		return this.triplestoreService.get(id, { cache: MS_30_MIN }, "MP.publication");
	}
}
