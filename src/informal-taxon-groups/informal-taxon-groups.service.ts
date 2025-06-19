import { InformalTaxonGroup as _InformalTaxonGroup } from "@luomus/laji-schema/models";
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

type InformalTaxonGroup = WithNonNullableKeys<_InformalTaxonGroup, "id" | "@context">

@Injectable()
@IntelligentInMemoryCache()
export class InformalTaxonGroupsService {

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

	async get(id: string): Promise<InformalTaxonGroup> {
		const lookup = await this.getLookup();
		const one = lookup[id];
		if (!one) {
			throw new HttpException("Informal taxon group not found", 404);
		}
		return one;
	}

	async getChildren(id: string): Promise<InformalTaxonGroup[]> {
		const parent = await this.get(id);
		const lookup = await this.getLookup();
		return (parent.hasSubGroup || []).map(id => lookup[id]!);
	}

	async getParent(id: string): Promise<InformalTaxonGroup> {
		const idToParent = (await this.getExpandedTreeAndParentLookup())[1];
		const parent = idToParent[id];
		if (!parent) {
			throw new HttpException("Informal taxon group or its parent not found", 404);
		}
		return (await this.getLookup())[parent]!;
	}

	async getSiblings(id: string): Promise<InformalTaxonGroup[]> {
		const lookup = await this.getLookup();
		const idToParent = (await this.getExpandedTreeAndParentLookup())[1];
		const parentId = idToParent[id];

		if (!parentId) {
			const exists = !!lookup[id];
			if (exists) {
				return this.getRoots();
			}
			throw new HttpException("Informal taxon group not found or id doesn't have parents", 404);
		}

		return lookup[parentId]!.hasSubGroup!.map(parentLevelId => lookup[parentLevelId]!);
	}

	async getTree() {
		return (await this.getExpandedTreeAndParentLookup())[0];
	}

	async getTranslatedTree(lang: Lang) {
		const removeJsonLDContext = omitForKeys<InformalTaxonGroupExpanded, "@context">("@context");
		const translate = (item: InformalTaxonGroupExpanded) => this.langService.translate(item, lang);
		return walkTreeWith(promisePipe(translate, removeJsonLDContext))(await this.getTree());
	}

	async getRoots() {
		const jsonLdContext = await this.getJsonLdContext();
		return (await this.getTree()).map(node => ({
			...node,
			hasSubGroup: node.hasSubGroup?.map(({ id }) => id),
			"@context": jsonLdContext
		}));
	}

	async getJsonLdContext() {
		return firstFromNonEmptyArr((await this.getAll()))["@context"];
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

	/**
	 * @returns tuple where:
	 *  * The first item is the informal taxon group tree, where the `hasSubGroup` is expanded from
	 *  * The second item is a id-to-parent lookup table.
	 */
	@IntelligentMemoize()
	async getExpandedTreeAndParentLookup(): Promise<[InformalTaxonGroupExpanded[], Record<string, string>]>
	{
		const lookup = await this.getLookup();
		const idToParent: Record<string, string> = {};
		const expandById = (id: string): InformalTaxonGroupExpanded => {
			const item = lookup[id];
			if (!item) {
				throw new HttpException(`Informal taxon group tree is broken. ${id} wasn't found in the tree`, 500);
			}
			const { hasSubGroup } = item;
			if (!hasSubGroup) {
				return item as InformalTaxonGroupExpanded;
			}
			hasSubGroup.forEach(id => {
				idToParent[id] = item.id;
			});
			return { ...item, hasSubGroup: hasSubGroup.map(expandById) };
		};

		const expanded = Object.keys(lookup).map(expandById);
		return [expanded.filter(({ id }) => !idToParent[id]), idToParent];
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
