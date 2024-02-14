import { Inject, Injectable, Logger } from "@nestjs/common";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { CACHE_30_MIN, dictionarifyByKey } from "src/utils";
import { Interval } from "@nestjs/schedule";
import { Area } from "./area.dto";

@Injectable()
export class AreaService {
	constructor(
		@Inject("TRIPLESTORE_READONLY_SERVICE") private triplestoreService: TriplestoreService,
	) { }

	private logger = new Logger(AreaService.name);

	async onModuleInit() {
		this.logger.log("Warming up areas started...");
		this.update().then(() => {
			this.logger.log("Warming up areas in background completed");
		});
	}

	@Interval(CACHE_30_MIN)
	async update() {
		this.all = undefined;
		this.byType = undefined;
		await this.getAllDict();
	}

	private getAll() {
		return this.triplestoreService.find<Area>({ type: "ML.area" }, { cache: CACHE_30_MIN });
	}


	private all?: Record<string, Area>;

	async getAllDict(): Promise<Record<string, Area>> {
		if (!this.all) {
			this.all = dictionarifyByKey(await this.getAll(), "id");
		}
		return this.all;
	}

	private byType?: Record<string, Area>;

	async getDictByType(type: Area["areaType"]) {
		if (!this.byType) {
			this.byType = dictionarifyByKey((await this.getAll()).filter(area => area.areaType === type), "id");
		}
		return this.byType;
	}
}
