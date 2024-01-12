import { HttpException, Inject, Injectable } from "@nestjs/common";
import { LANGS, MultiLang } from "src/common.dto";
import { RestClientService } from "src/rest-client/rest-client.service";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { Collection, GbifCollectionResult, MetadataStatus, TriplestoreCollection } from "./collection.dto";
import { Interval } from "@nestjs/schedule";
import { CACHE_10_MIN } from "src/utils";

const GBIF_DATASET_PARENT = "HR.3777";

@Injectable()
export class CollectionsService {

	constructor(
		@Inject("GBIF_REST_CLIENT") private gbifRestClient: RestClientService,
		private triplestoreService: TriplestoreService
	) {
		this.update();
	}

	private collections: Collection[] | undefined;
	private idToCollection: Record<string, Collection> | undefined;
	private idToChildren: Record<string, Collection[]> | undefined;

	@Interval(CACHE_10_MIN)
	async update() {
		this.collections = undefined;
		this.idToCollection = undefined;
		this.idToChildren = undefined;
		await this.getIdToChildren();
	}

	/** @throws HttpException */
	async get(id: string) {
		const collection = (await this.getIdToCollection())[id];
		if (!collection) {
			throw new HttpException("Not found", 404);
		}
		return collection;
	}

	async findChildren(id: string) {
		return (await this.getIdToChildren())[id] || [];
	}

	async findRoots() {
		return (await this.getCollections()).filter(collection => 
			!collection.isPartOf
		);
	}

	async getParents(id: string): Promise<Collection[]> {
		const idToCollection = await this.getIdToCollection();
		const parents = [];
		let collection = idToCollection[id];
		while (collection.isPartOf) {
			collection = idToCollection[collection.isPartOf];
			parents.push(collection)
		}
		return parents;
	}

	async getCollections(ids?: string[])
		: Promise<Collection[]> {
		const collections = [];
		const all = await this.getAll();
		if (!ids) {
			return all;
		}
		for (const collection of all) {
			if (ids?.length && !ids.includes(collection.id)) {
				continue;
			}
			collections.push(collection);
		}
		return collections;
	}

	private async getIdToCollection(): Promise<Record<string, Collection<MultiLang>>> {
		const cached = this.idToCollection;
		if (cached) {
			return cached;
		}

		const idToCollection = (await this.getAll()).reduce((idToCollection, c) => {
			idToCollection[c.id] = c;
			return idToCollection;
		}, {} as Record<string, Collection<MultiLang>>)
		this.idToCollection = idToCollection;
		return idToCollection;
	}

	private async getIdToChildren() {
		const cached = this.idToChildren;
		if (cached) {
			return cached;
		}
		this.idToChildren = {};
		const collections = await this.getCollections();
		for (const c of collections) {
			this.idToChildren[c.id] = collections.filter(collection => collection.isPartOf === c.id);
		}
		return this.idToChildren;
	}

	private async getAll(): Promise<Collection<MultiLang>[]> {
		const cached = this.collections;
		if (cached) {
			return cached;
		}
		this.collections = (await this.getTriplestoreCollections()).concat(await this.getGbifCollections());
		return this.collections
	}

	private async getTriplestoreCollections(): Promise<Collection<MultiLang>[]> {
		const collections = await this.triplestoreService.find<TriplestoreCollection>(
			{ type: "MY.collection" },
			{ cache: CACHE_10_MIN }
		);

		const collectionIdToChildIds: Record<string, string[]> = {};
		function putToCollectionTree (collection: TriplestoreCollection) {
			const { isPartOf } = collection;
			if (!isPartOf) {
				return;
			}
			collectionIdToChildIds[isPartOf] = collectionIdToChildIds[isPartOf] || [];
			collectionIdToChildIds[isPartOf].push(collection.id);
		}

		const idToCollection = collections.reduce<Record<string, TriplestoreCollection>>(
			(idToCollection, collection) => {
				idToCollection[collection.id] = collection;
				putToCollectionTree(collection);
				return idToCollection;
			}, {});

		return collections.reduce((collections: Collection<MultiLang>[], collection: TriplestoreCollection) => {
			if (collectionIsHidden(collection, idToCollection)) {
				return collections;
			}

			// TODO hack in old api. Waiting for response if we can remove it.
			// Doesn't work right away it commented back in, because the lang service will try
			// to translate them. We'd need some blacklist for the translation method for this to work.
			//
			// // Remove language fields that are really not multilang fields.
			// const notReallyMultiLangKeys: (keyof TriplestoreCollection)[] = [
			// 	"temporalCoverage", "taxonomicCoverage", "collectionLocation",
			// 	"dataLocation", "methods", "coverageBasis", "geographicCoverage"
			// ];
			// notReallyMultiLangKeys.forEach(prop => {
			// 	if (prop in collection) {
			// 		(collection as any)[prop] = pickFromMultiLang((collection as any)[prop], Lang.en);
			// 	}
			// });

			collection.downloadRequestHandler = getInheritedProperty(
				"downloadRequestHandler", collection, idToCollection
			);
			collection.shareToFEO = getInheritedProperty(
				"shareToFEO", collection, idToCollection
			);
			(collection as Collection<MultiLang>).longName = getLongName(collection, idToCollection);
			(collection as Collection<MultiLang>).hasChildren = !!collectionIdToChildIds[collection.id]
				|| collection.id === GBIF_DATASET_PARENT;

			collections.push(collection as Collection<MultiLang>);
			return collections;
		}, []);
	}

	private async getGbifCollections(): Promise<Collection<MultiLang>[]> {
		const gbifCollections = await this.gbifRestClient.get<GbifCollectionResult>(
			"installation/92a00840-efe1-4b82-9a1d-c655b34c8fce/dataset",
			{ params: { limit: 1000 } },
			{ cache: CACHE_10_MIN }
		);
		return gbifCollections.results.map(collection => {
			const contact = collection.contacts && collection.contacts[0] || {};
			return {
				id: "gbif-dataset:" + collection.key,
				"@context": "MY.collection",
				collectionType: "MY.collectionTypeMixed",
				collectionName: { en: collection.title, fi: "", sv: "" },
				longName: { en: collection.title, fi: "", sv: "" },
				description: { en: collection.description, fi: "", sv: "" },
				personResponsible: contact.lastName ? contact.lastName + ", " + contact.firstName : contact.firstName,
				contactEmail: Array.isArray(contact.email) && contact.email.length > 0 ? contact.email[0] : "",
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
				? collectionIsHidden(idToCollection[(collection.isPartOf as string)], idToCollection)
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
				? getInheritedProperty(property, idToCollection[collection.isPartOf], idToCollection)
				: undefined)

const getRootParent = (collection: TriplestoreCollection, idToCollection: Record<string, TriplestoreCollection>)
	: TriplestoreCollection | undefined => {
	let parent = collection.isPartOf
		? idToCollection[collection.isPartOf]
		: undefined;
	while (parent?.isPartOf) {
		parent = idToCollection[parent.isPartOf];
	}
	return parent;
}

const getLongName = (
	collection: TriplestoreCollection,
	idToCollection: Record<string, TriplestoreCollection>
): MultiLang => {
	const rootParent = getRootParent(collection, idToCollection);
	const { abbreviation } = collection;
	const { abbreviation: rootAbbreviation } = rootParent || {};
	return LANGS.reduce<MultiLang>((multiLang, lang) => {
		const collectionName = collection.collectionName?.[lang];
		multiLang[lang] = collectionName
			? [
				rootAbbreviation ? `${rootAbbreviation} -` : undefined,
				collectionName,
				abbreviation ? `(${abbreviation})` : undefined
			].filter(s => typeof s === "string")
			 .join(" ")
			: "";
		return multiLang;
	}, {});
}
