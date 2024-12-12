import { InformalTaxonGroup as _InformalTaxonGroup } from "@luomus/laji-schema/models";
import { HttpException, Inject, Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { Lang, MultiLangAsString, HasJsonLdContext } from "src/common.dto";
import { IntelligentInMemoryCache } from "src/decorators/intelligent-in-memory-cache.decorator";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { LangService } from "src/lang/lang.service";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { WithNonNullableKeys, omit, omitForKeys } from "src/typing.utils";
import { CACHE_10_MIN, dictionarifyByKey, firstFromNonEmptyArr, promisePipe } from "src/utils";

const CACHE_TTL = CACHE_10_MIN;

type InformalTaxonGroup = WithNonNullableKeys<_InformalTaxonGroup, "id" | "@context">

@Injectable()
@IntelligentInMemoryCache()
export class InformalTaxonGroupsService {

	private logger = new Logger(InformalTaxonGroupsService.name);

	constructor(
		@Inject("TRIPLESTORE_READONLY_SERVICE") private triplestoreService: TriplestoreService,
		private langService: LangService
	) { }

	@Interval(CACHE_TTL)
	async warmup() {
		await this.getLookup();
	}

	async find(ids?: string[]) {
		const all = await this.getAll();
		if (!ids?.length) {
			return all;
		}
		return all.filter(a => !ids || ids.includes(a.id));
	}

	@IntelligentMemoize()
	async getTree() {
		return this.expandFromLookup(await this.getLookup());
	}

	async getTranslatedTree(lang: Lang, langFallback?: boolean) {
		const removeJsonLDContext = omitForKeys<InformalTaxonGroupExpanded, "@context">("@context");
		const translate = (item: InformalTaxonGroupExpanded) => this.langService.translate(item, lang, langFallback);
		return walkTreeWith(promisePipe(translate, removeJsonLDContext))(await this.getTree());
	}

	async getNonExpandedRoots() {
		return (await this.getTree()).map(node => {
			const { hasSubGroup } = node;
			return hasSubGroup ? { ...node, hasSubGroup: hasSubGroup.map(({ id }) => id) } : node;
		});
	}


	@IntelligentMemoize()
	private async getAll() {
		return this.triplestoreService.find<InformalTaxonGroup>(
			{ type: "MVL.informalTaxonGroup" },
			{ cache: CACHE_TTL }
		);
	}

	@IntelligentMemoize()
	async getLookup(): Promise<Record<string, InformalTaxonGroup>> {
		return dictionarifyByKey(await this.getAll(), "id");
	}

	expandFromLookup(lookup: Record<string, InformalTaxonGroup>): InformalTaxonGroupExpanded[] {
		const idToHasParent: Record<string, boolean> = {};
		const expandById = (id: string): InformalTaxonGroupExpanded => {
			const item = lookup[id];
			if (!item) {
				const msg = `Informal taxon group tree is broken. ${id} wasn't found the tree`;
				// this.logger.fatal(msg);
				throw new HttpException(msg, 500);
			}
			const { hasSubGroup } = item;
			if (!hasSubGroup) {
				return item as InformalTaxonGroupExpanded;
			}
			hasSubGroup.forEach(id => {
				idToHasParent[id] = true;
			})
			return { ...item, hasSubGroup: hasSubGroup.map(expandById) };
		};

		const expanded = Object.keys(lookup).map(expandById);
		return expanded.filter(({ id }) => !idToHasParent[id]);
	}
}

/** InformalTaxonGroup with the `hasSubGroup` ids being expanded into instances of InformalTaxonGroup */
type InformalTaxonGroupExpanded = Omit<InformalTaxonGroup, "hasSubGroup"> & {
	hasSubGroup?: InformalTaxonGroupExpanded[];
}

type InformalTaxonGroupWithSubGroupsAs<I extends InformalTaxonGroupExpanded, T> = Omit<I, "hasSubGroup"> & {
	hasSubGroup?: InformalTaxonGroupWithSubGroupsAs<I, T>[];
}

const walkTreeWith = <T>(
	pipe: (item: InformalTaxonGroupExpanded) =>
		Promise<
			Omit<
					InformalTaxonGroupWithSubGroupsAs<InformalTaxonGroupExpanded, T>
					| MultiLangAsString<InformalTaxonGroupWithSubGroupsAs<InformalTaxonGroupExpanded, T>>,
			"@context">
			>
) => (treeBranches: InformalTaxonGroupExpanded[]) =>
		Promise.all(treeBranches.map(async treeNode => {
			const transformed = await pipe(treeNode);
			if (!transformed.hasSubGroup) {
				return transformed;
			}
			return {
				...transformed,
				hasSubGroup: await (walkTreeWith(pipe) as any)(transformed.hasSubGroup)
			};
		}));
