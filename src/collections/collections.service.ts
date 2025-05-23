import { HttpException, Inject, Injectable } from "@nestjs/common";
import { LANGS, MultiLang } from "src/common.dto";
import { RestClientService } from "src/rest-client/rest-client.service";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { Collection, GbifCollectionResult, GbifContact, MetadataStatus, TriplestoreCollection } from "./collection.dto";
import { Interval } from "@nestjs/schedule";
import { CACHE_10_MIN, joinOnlyStrings } from "src/utils";
import { IntelligentInMemoryCache } from "src/decorators/intelligent-in-memory-cache.decorator";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { GBIF_CLIENT } from "src/provider-tokens";

const GBIF_DATASET_PARENT = "HR.3777";


class CollectionNotFoundError extends HttpException {
	constructor(id: string) {
		super(`Collection ${id} not found`, 404);
	}
}

@Injectable()
@IntelligentInMemoryCache()
export class CollectionsService {

	constructor(
		@Inject(GBIF_CLIENT) private gbifClient: RestClientService<unknown>,
		private triplestoreService: TriplestoreService
	) { }

	@Interval(CACHE_10_MIN)
	async warmup() {
		await this.getIdToChildren();
	}

	async get(id: string) {
		const collection = (await this.getIdToCollection())[id];
		if (!collection) {
			throw new CollectionNotFoundError(id);
		}
		return collection;
	}

	@IntelligentMemoize()
	async findChildren(id: string) {
		return (await this.getIdToChildren())[id] || [];
	}

	@IntelligentMemoize()
	async findDescendants(id: string): Promise<Collection[]> {
		const idToChildren = await this.getIdToChildren();
		const children  = idToChildren[id];
		if (!children) {
			return [];
		}
		return [
			...children,
			...await children.reduce(async (children, collection) =>
				(await children).concat(await this.findDescendants(collection.id)), Promise.resolve([] as Collection[]))
		];
	}

	@IntelligentMemoize()
	async findRoots() {
		return (await this.findCollections()).filter(collection =>
			!collection.isPartOf
		);
	}

	@IntelligentMemoize()
	async getParents(id: string): Promise<Collection[]> {
		const idToCollection = await this.getIdToCollection();
		const parents: Collection[] = [];
		let collection = idToCollection[id];
		let nextId: string | undefined;
		if (!collection) {
			throw new CollectionNotFoundError(id);
		}
		while (collection) {
			if (!collection.isPartOf) {
				break;
			}
			nextId = collection.isPartOf;
			collection = idToCollection[nextId];
			if (!collection) {
				throw new HttpException(`Collection ${id} has nonexisting parent ${nextId}`, 404);
			}
			parents.push(collection);
		}
		return parents;
	}

	@IntelligentMemoize()
	async findCollections(ids?: string[])
		: Promise<Collection[]> {
		const all = await this.getAll();
		if (!ids?.length) {
			return all;
		}
		return all.filter(c => ids.includes(c.id));
	}

	@IntelligentMemoize()
	private async getIdToCollection(): Promise<Record<string, Collection>> {
		return (await this.getAll()).reduce((idToCollection, c) => {
			idToCollection[c.id] = c;
			return idToCollection;
		}, {} as Record<string, Collection>);
	}

	@IntelligentMemoize()
	private async getIdToChildren() {
		const idToChildren: Record<string, Collection[]> = {};
		const collections = await this.findCollections();
		for (const c of collections) {
			idToChildren[c.id] = collections.filter(collection => collection.isPartOf === c.id);
		}
		return idToChildren;
	}

	@IntelligentMemoize()
	private async getAll(): Promise<Collection[]> {
		return (await this.getTriplestoreCollections()).concat(await this.getGbifCollections());
	}

	private async getTriplestoreCollections(): Promise<Collection[]> {
		const collections = await this.triplestoreService.find<TriplestoreCollection>(
			{ type: "MY.collection" },
			{ cache: CACHE_10_MIN }
		);
		const collectionIdToChildIds: Record<string, string[]> = {};
		function putToCollectionTree(collection: TriplestoreCollection) {
			const { isPartOf } = collection;
			if (!isPartOf) {
				return;
			}
			collectionIdToChildIds[isPartOf] = collectionIdToChildIds[isPartOf] || [];
			collectionIdToChildIds[isPartOf]!.push(collection.id);
		}

		const idToCollection = collections.reduce<Record<string, TriplestoreCollection>>(
			(idToCollection, collection) => {
				idToCollection[collection.id] = collection;
				putToCollectionTree(collection);
				return idToCollection;
			}, {});

		return collections.reduce((collections: Collection[], collection: TriplestoreCollection) => {
			if (collectionIsHidden(collection, idToCollection)) {
				return collections;
			}

			collection.downloadRequestHandler = getInheritedProperty(
				"downloadRequestHandler", collection, idToCollection
			);
			collection.shareToFEO = getInheritedProperty(
				"shareToFEO", collection, idToCollection
			);

			 // Convert stringy booleans into real boolean
			if (collection.shareToFEO) collection.shareToFEO = Boolean(collection.shareToFEO);

			(collection as Collection).longName = getLongName(collection, idToCollection);
			(collection as Collection).hasChildren = !!collectionIdToChildIds[collection.id]
				|| collection.id === GBIF_DATASET_PARENT;

			collections.push(collection as Collection);
			return collections;
		}, []);
	}

	private async getGbifCollections(): Promise<Collection[]> {
		const gbifCollections = await this.gbifClient.get<GbifCollectionResult>(
			"installation/92a00840-efe1-4b82-9a1d-c655b34c8fce/dataset",
			{ params: { limit: 1000 } },
			{ cache: CACHE_10_MIN }
		);
		return gbifCollections.results.map(collection => {
			const contact = collection.contacts && collection.contacts[0] || {} as GbifContact;
			return {
				id: "gbif-dataset:" + collection.key,
				"@context": "MY.collection",
				collectionType: "MY.collectionTypeMixed",
				collectionName: { en: collection.title },
				longName: { en: collection.title },
				description: { en: collection.description },
				personResponsible: contact.lastName ? contact.lastName + ", " + contact.firstName : contact.firstName,
				contactEmail: Array.isArray(contact.email) && contact.email.length > 0
					? contact.email[0]
					: "info@laji.fi",
				intellectualRights: "MY.intellectualRightsCC-BY",
				isPartOf: GBIF_DATASET_PARENT
			};
		});
	}
}

const collectionIsHidden = (
	collection: TriplestoreCollection,
	idToCollection: Record<string, TriplestoreCollection>
) : boolean =>
	collection.metadataStatus === MetadataStatus.Hidden
		|| (
			(collection.isPartOf && idToCollection[(collection.isPartOf as string)])
				? collectionIsHidden(idToCollection[(collection.isPartOf as string)]!, idToCollection)
				: false
		);

/** If the property is undefined, attempt to recursively get it from parent collections */
const getInheritedProperty = <K extends keyof TriplestoreCollection>(
	property: K,
	collection: TriplestoreCollection,
	idToCollection: Record<string, TriplestoreCollection>
) : TriplestoreCollection[K] | undefined =>
		collection[property] !== undefined
			? collection[property]
			: ((collection.isPartOf && idToCollection[(collection.isPartOf as string)])
				? getInheritedProperty(property, idToCollection[collection.isPartOf]!, idToCollection)
				: undefined);

const getRootParent = (collection: TriplestoreCollection, idToCollection: Record<string, TriplestoreCollection>)
	: TriplestoreCollection | undefined => {
	let parent = collection.isPartOf
		? idToCollection[collection.isPartOf]
		: undefined;
	while (parent?.isPartOf) {
		parent = idToCollection[parent.isPartOf];
	}
	return parent;
};

const getLongName = (
	collection: TriplestoreCollection,
	idToCollection: Record<string, TriplestoreCollection>
): MultiLang => {
	const rootParent = getRootParent(collection, idToCollection);
	const { abbreviation } = collection;
	const { abbreviation: rootAbbreviation } = rootParent || {};
	return LANGS.reduce<MultiLang>((multiLang, lang) => {
		const collectionName = collection.collectionName?.[lang];
		const longName = collectionName
			? joinOnlyStrings(
				rootAbbreviation && `${rootAbbreviation} -`,
				collectionName,
				abbreviation && `(${abbreviation})`)
			: undefined;
		if (typeof longName === "string") {
			multiLang[lang] = longName;
		}
		return multiLang;
	}, {});
};
