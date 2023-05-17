import { CACHE_MANAGER, HttpException, Inject, Injectable } from "@nestjs/common";
import { Lang, LANGS, MultiLang } from "src/common.dto";
import { LangService } from "src/lang/lang.service";
import { RestClientService } from "src/rest-client/rest-client.service";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { serializeInto } from "src/type-utils";
import { pageResult, promisePipe } from "src/utils";
import { Collection, GbifCollectionResult, MetadataStatus, TriplestoreCollection } from "./collection.dto";
import { Cache } from "cache-manager";

const CACHE_10_MIN = 1000 * 60 * 10;
const GBIF_DATASET_PARENT = "HR.3777";

// TODO update collections every 10min
@Injectable()
export class CollectionsService {

	constructor(
		@Inject("GBIF_REST_CLIENT") private gbifRestClient: RestClientService,
		private triplestoreService: TriplestoreService,
		private langService: LangService,
		@Inject(CACHE_MANAGER) private cache: Cache
	) {}

	async getPage(ids?: string[], lang?: Lang, langFallback?: boolean, page?: number, pageSize?: number) {
		const collections = await this.getCollections(ids, lang, langFallback);
		return pageResult(collections, page, pageSize, lang);
	}

	async findOne(id: string, lang: Lang = Lang.en, langFallback = true) {
		const collection = (await this.getIdToCollection())[id];
		if (!collection) {
			throw new HttpException("Not found", 404);
		}
		return this.prepareCollection(collection, lang, langFallback);
	}

	async findChildren(id: string, lang?: Lang, langFallback?: boolean, page?: number, pageSize?: number) {
		const children = (await this.getCollections(undefined, lang, langFallback)).filter(collection => 
			collection.isPartOf === id
		);
		return pageResult(children, page, pageSize, lang);
	}

	async findRoots(lang?: Lang, langFallback?: boolean, page?: number, pageSize?: number) {
		const children = (await this.getCollections(undefined, lang, langFallback)).filter(collection => 
			!collection.isPartOf
		);
		return pageResult(children, page, pageSize, lang);
	}

	private async getCollections<T extends (string | MultiLang)>(ids?: string[], lang?: Lang, langFallback?: boolean)
		: Promise<Collection<T>[]> {
		const collections = []
		for (const collection of await this.getAll()) {
			if (ids?.length && !ids.includes(collection.id)) {
				continue;
			}
			collections.push(await this.prepareCollection<T>(collection, lang, langFallback));
		}
		return collections;
	}

	private prepareCollection<T extends (string | MultiLang)>
	(collection: Collection<MultiLang>, lang?: Lang, fallbackLang?: boolean) {
		return promisePipe(collection,
			this.langService.translateWith(lang, fallbackLang, ["longName"]),
			serializeInto(Collection)
		) as Promise<Collection<T>>;
	}

	private async getIdToCollection(): Promise<Record<string, Collection<MultiLang>>> {
		const cached = await this.cache.get<Record<string, Collection<MultiLang>>>("idToCollection");
		if (cached) {
			return cached;
		}

		const idToCollection = (await this.getAll()).reduce((idToCollection, c) => {
			idToCollection[c.id] = c;
			return idToCollection;
		}, {} as Record<string, Collection<MultiLang>>)
		this.cache.set("idToCollection", idToCollection);
		return idToCollection;
	}

	private async getAll(): Promise<Collection<MultiLang>[]> {
		return (await this.getTriplestoreCollections()).concat(await this.getGbifCollections());
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

			collection.downloadRequestHandler = getCollectionRequestHandler(collection, idToCollection);
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

const getCollectionRequestHandler = (
	collection: TriplestoreCollection,
	idToCollection: Record<string, TriplestoreCollection>
) : string[] | undefined => 
	collection.downloadRequestHandler
		|| ((collection.isPartOf && idToCollection[(collection.isPartOf as string)])
			? getCollectionRequestHandler(idToCollection[collection.isPartOf], idToCollection)
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
		multiLang[lang] =[
			rootAbbreviation ? `${rootAbbreviation} -` : undefined,
			collection.collectionName?.[lang],
			abbreviation ? `(${abbreviation})` : undefined
		].filter(s => typeof s === "string")
		 .join(" ");
		return multiLang;
	}, {});
}
