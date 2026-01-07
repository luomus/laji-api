import { IucnRedListTaxonGroup as _IucnRedListTaxonGroup } from "@luomus/laji-schema/models";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { Lang, MultiLangAsString } from "src/common.dto";
import { IntelligentInMemoryCache } from "src/decorators/intelligent-in-memory-cache.decorator";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { LangService } from "src/lang/lang.service";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { WithNonNullableKeys, omitForKeys } from "src/typing.utils";
import { CACHE_10_MIN, dictionarifyByKey, firstFromNonEmptyArr, promisePipe } from "src/utils";

const CACHE_TTL = CACHE_10_MIN;

type RedListEvaluationGroup = WithNonNullableKeys<_IucnRedListTaxonGroup, "id" | "@context">

// Copy paste from informal taxon groups service.
@Injectable()
@IntelligentInMemoryCache()
export class RedListEvaluationGroupsService {

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

	async get(id: string): Promise<RedListEvaluationGroup> {
		const lookup = await this.getLookup();
		const one = lookup[id];
		if (!one) {
			throw new HttpException("Red list evaluation gorup not found", 404);
		}
		return one;
	}

	async getChildren(id: string): Promise<RedListEvaluationGroup[]> {
		const parent = await this.get(id);
		const lookup = await this.getLookup();
		return (parent.hasIucnSubGroup || []).map(id => lookup[id]!);
	}

	async getParent(id: string): Promise<RedListEvaluationGroup> {
		const idToParent = (await this.getExpandedTreeAndParentLookup())[1];
		const parent = idToParent[id];
		if (!parent) {
			throw new HttpException("Red list evaluation group or its parent not found", 404);
		}
		return (await this.getLookup())[parent]!;
	}

	async getSiblings(id: string): Promise<RedListEvaluationGroup[]> {
		const lookup = await this.getLookup();
		const idToParent = (await this.getExpandedTreeAndParentLookup())[1];
		const parentId = idToParent[id];

		if (!parentId) {
			const exists = !!lookup[id];
			if (exists) {
				return this.getRoots();
			}
			throw new HttpException("Red list evaluation group not found or id doesn't have parents", 404);
		}

		return lookup[parentId]!.hasIucnSubGroup!.map(parentLevelId => lookup[parentLevelId]!);
	}

	async getTree() {
		return (await this.getExpandedTreeAndParentLookup())[0];
	}

	async getTranslatedTree(lang: Lang) {
		const removeJsonLDContext = omitForKeys<IucnRedListTaxonGroupExpanded, "@context">("@context");
		const translate = (item: IucnRedListTaxonGroupExpanded) => this.langService.translate(item, lang);
		return walkTreeWith(promisePipe(translate, removeJsonLDContext))(await this.getTree());
	}

	async getRoots() {
		const jsonLdContext = await this.getJsonLdContext();
		return (await this.getTree()).map(node => ({
			...node,
			hasIucnSubGroup: node.hasIucnSubGroup?.map(({ id }) => id),
			"@context": jsonLdContext
		}));
	}

	async getJsonLdContext() {
		return firstFromNonEmptyArr((await this.getAll()))["@context"];
	}

	@IntelligentMemoize()
	private async getAll() {
		return this.triplestoreService.find<RedListEvaluationGroup>(
			{ type: "MVL.iucnRedListTaxonGroup" },
			{ cache: CACHE_TTL }
		);
	}

	@IntelligentMemoize()
	async getLookup(): Promise<Record<string, RedListEvaluationGroup>> {
		return dictionarifyByKey(await this.getAll(), "id");
	}

	/**
	 * @returns tuple where:
	 *  * The first item is the red list evaluation group tree, where the `hasIucnSubGroup` is expanded from
	 *  * The second item is a id-to-parent lookup table.
	 */
	@IntelligentMemoize()
	async getExpandedTreeAndParentLookup(): Promise<[IucnRedListTaxonGroupExpanded[], Record<string, string>]>
	{
		const lookup = await this.getLookup();
		const idToParent: Record<string, string> = {};
		const expandById = (id: string): IucnRedListTaxonGroupExpanded => {
			const item = lookup[id];
			if (!item) {
				throw new HttpException(`Red list evalution group tree is broken. ${id} wasn't found in the tree`, 500);
			}
			const { hasIucnSubGroup } = item;
			if (!hasIucnSubGroup) {
				return item as IucnRedListTaxonGroupExpanded;
			}
			hasIucnSubGroup.forEach(id => {
				idToParent[id] = item.id;
			});
			return { ...item, hasIucnSubGroup: hasIucnSubGroup.map(expandById) };
		};

		const expanded = Object.keys(lookup).map(expandById);
		return [expanded.filter(({ id }) => !idToParent[id]), idToParent];
	}
}

/** IucnRedListTaxonGroup with the `hasIucnSubGroup` ids being expanded into instances of IucnRedListTaxonGroup */
type IucnRedListTaxonGroupExpanded = Omit<RedListEvaluationGroup, "hasIucnSubGroup"> & {
	hasIucnSubGroup?: IucnRedListTaxonGroupExpanded[];
}

type IucnRedListTaxonGroupWithSubGroupsAs<I extends IucnRedListTaxonGroupExpanded, T> = Omit<I, "hasIucnSubGroup"> & {
	hasIucnSubGroup?: IucnRedListTaxonGroupWithSubGroupsAs<I, T>[];
}

const walkTreeWith = <T>(
	pipe: (item: IucnRedListTaxonGroupExpanded) =>
		Promise<
			Omit<
					IucnRedListTaxonGroupWithSubGroupsAs<IucnRedListTaxonGroupExpanded, T>
					| MultiLangAsString<IucnRedListTaxonGroupWithSubGroupsAs<IucnRedListTaxonGroupExpanded, T>>,
			"@context">
			>
) => (treeBranches: IucnRedListTaxonGroupExpanded[]) =>
		Promise.all(treeBranches.map(async treeNode => {
			const transformed = await pipe(treeNode);
			if (!transformed.hasIucnSubGroup) {
				return transformed;
			}
			return {
				...transformed,
				hasIucnSubGroup: await (walkTreeWith(pipe) as any)(transformed.hasIucnSubGroup)
			};
		}));
