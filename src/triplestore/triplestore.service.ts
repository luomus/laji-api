import { HttpException, Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";
import { parse, serialize, graph } from "rdflib";
import { isObject, JSONSerializable, JSONObjectSerializable, MaybePromise, RemoteContextual, MaybeContextual,
	MaybeArray } from "../typing.utils";
import { asArray, lastFromNonEmptyArr, MS_30_MIN, omitFromArray, pipe } from "src/utils";
import { ClassProperties, MetadataService } from "src/metadata/metadata.service";
import { MultiLang } from "src/common.dto";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { GLOBAL_CLIENT, TRIPLESTORE_CLIENT } from "src/provider-tokens";
import { Property } from "src/metadata/metadata.dto";

const BASE_URL = "http://tun.fi/";

const NON_SCHEMATIC_KEYS = ["@context", "@type", "@id"];
const SKIP_KEYS = ["@type", "rdfs:comment",  "rdfs:label"];

type JSONLDNode = {
	"@type": string;
	"@graph": MaybeArray<JSONLDNode>;
}

type ResourceIdentifierObj = { "@id": string };
const isResourceIdentifier = (data: any): data is ResourceIdentifierObj =>
	isObject(data) && Object.keys(data).length === 1 && "@id" in data;

type MultiLangResource = { "@language": string; "@value": string };

export type TriplestoreSearchQuery = {
	format?: string;
	type?: string;
	predicate?: string;
	objectresource?: string;
	objectliteral?: string | boolean;
	limit?: number;
	offset?: number;
	object?: string;
	subject?: string;
}

type TriplestoreQueryOptions = {
	cache?: number;
};

type SWRCacheEntry<S> = {
	data: S,
	timestamp: number
}

const baseQuery = { format: "rdf/xml", limit: 999999999 };

// Caching is implemented with stale-while-revalidate strategy. Data stored in Redis cache doesn't use Redis' TTL
// mechanism because we need the stale data. Instead, we timestamp the cached data and do a TTL comparison ourself.
@Injectable()
export class TriplestoreService {
	constructor(
		@Inject(TRIPLESTORE_CLIENT) private triplestoreClient: RestClientService<JSONSerializable>,
		private metadataService: MetadataService,
		private cache: RedisCacheService,
		@Inject(GLOBAL_CLIENT) private globalClient: RestClientService<any>,
	) {
		this.JSONLDDocumentLoaderWithCache = this.JSONLDDocumentLoaderWithCache.bind(this);
	}

	/** Get a resource from triplestore */
	async get<T>(resource: string, options?: TriplestoreQueryOptions, type?: string): Promise<T> {
		const { cache } = options || {};
		const cacheKey = getPathAndQuery(resource, undefined, type);
		return this.withSWR(cacheKey, cache, () => this.rdfToJsonLd<T>(
			this.triplestoreClient.get(resource, { params: { ...baseQuery, ...(type ? { type } : { }) } }),
			cacheKey,
			options
		));
	}

	/** Find multiple resources from triplestore */
	async find<T extends MaybeContextual>(query: TriplestoreSearchQuery = {}, options?: TriplestoreQueryOptions)
		: Promise<RemoteContextual<T>[]> {
		query = { ...baseQuery, ...query };
		const { cache } = options || {};
		return this.withSWR(getPathAndQuery("search", query), cache, async () =>
			asArray(await this.rdfToJsonLd<MaybeArray<RemoteContextual<T>>>(
				this.triplestoreClient.get("search", { params: query }),
				getPathAndQuery("search", query),
				options
			))
		);
	}

	/** Get count for a resource */
	async count(query: TriplestoreSearchQuery = {}, options?: TriplestoreQueryOptions)
		: Promise<number> {
		query = { ...baseQuery, format: "json", ...query };
		return (await this.triplestoreClient.get<{ count: number }>("search/count", { params: query }, options)).count;
	}

	private async withSWR<S>(
		cacheKey: string,
		cacheTTL: TriplestoreQueryOptions["cache"],
		createAndCacheRequest: () => Promise<S>
	): Promise<S> {
		if (!cacheTTL) {
			return createAndCacheRequest();
		}
		const SWREntry = await this.cache.get<SWRCacheEntry<S>>(cacheKey);
		if (!SWREntry) {
			return createAndCacheRequest();
		}

		const isFresh = SWREntry.timestamp + cacheTTL > Date.now();
		if (!isFresh) {
			void createAndCacheRequest();
		}
		return SWREntry.data;
	}


	/** Caches the result also */
	private async rdfToJsonLd<T>(
		rdf: MaybePromise<JSONSerializable>,
		cacheKey: string,
		options?: TriplestoreQueryOptions
	): Promise<T> {
		const jsonld = triplestoreToJsonLd(await rdf);
		const isArrayResult = Array.isArray(jsonld["@graph"]);
		if (isArrayResult && (jsonld["@graph"] as any).length === 0) {
			return [] as T;
		}

		const jsonldContext = isArrayResult
			? (jsonld["@graph"] as any)[0]["@type"]
			: jsonld["@type"];
		const properties = await this.metadataService.getPropertiesForJsonLdContext(
			MetadataService.parseClassNameFromJsonLdContext(jsonldContext)
		);
		const formatted =  await (isArrayResult
			? Promise.all((jsonld["@graph"] as any).map((i: any) =>
				compactJsonLdAndAdhereToSchema(i, properties))
			)
			: compactJsonLdAndAdhereToSchema(jsonld, properties)
		);

		return this.cacheResult(formatted, cacheKey, options) as T;
	}

	private async cacheResult<T>(item: T, cacheKey: string, options?: TriplestoreQueryOptions): Promise<T> {
		options?.cache && await this.cache.set(
			cacheKey,
			{ data: item, timestamp: Date.now() }
		);
		return item;
	}

	async JSONLDDocumentLoaderWithCache(url: string) {
		return this.globalClient.get(
			url,
			{ headers: { Accept: "application/ld+json" } },
			{
				cache: MS_30_MIN,
				transformer: (result: any) => ({
					contextUrl: null, documentUrl: url, document: result
				})
			});
	}
}

const getPathAndQuery = (resource: string, query?: TriplestoreSearchQuery, type?: string) => {
	return resource + type + JSON.stringify(query || {});
};

const triplestoreToJsonLd = (rdf: JSONSerializable): JSONLDNode => {
	const rdfStore = graph();
	parse(rdf as any, rdfStore, BASE_URL, "application/rdf+xml");
	const jsonld = serialize(null, rdfStore, BASE_URL, "application/ld+json");
	if (!jsonld) {
		throw new HttpException("Not found in triplestore", 404);
	}
	return JSON.parse(jsonld);
};

/**
 * JsonLd resources are in the input like { "@id": "http://tun.fi/MOS.500" }.
 * This function resolves those resources into values like "MOS.500".
 */
const resolveResources = (jsonLd: JSONSerializable) => {
	if (isResourceIdentifier(jsonLd)) {
		return jsonLd["@id"].replace(BASE_URL, "");
	}
};

const maxOccurs = (property: Property) => (jsonLd: JSONSerializable) => {
	if (property?.maxOccurs === "unbounded" && jsonLd && !Array.isArray(jsonLd)) {
		return [jsonLd];
	}
	return jsonLd;
};

const resolveLangResources = (property: Property) => (jsonLd: JSONSerializable) => {
	if (jsonLd && property.multiLanguage) {
		if (typeof jsonLd === "string") {
			return { en: jsonLd };
		}
		return asArray(jsonLd).reduce<MultiLang>((langObj: MultiLang, resource: MultiLangResource) => {
			return {
				...langObj,
				[resource["@language"]]: resource["@value"]
			};
		}, {});
	};
	return jsonLd;
};

const typeFromRange = (property: Property) => (jsonLd: JSONSerializable) => {
	const { range } = property;
	if (range === "xsd:boolean") {
		if (jsonLd === "true") {
			return true;
		}
		if (jsonLd === "false") {
			return false;
		}
	}
	return jsonLd;
};

const dropURI = (key: string) => key.replace(BASE_URL, "");

const unprefix = (k: string) => lastFromNonEmptyArr(k.split("."));

const rmId = (jsonLd: JSONObjectSerializable) => {
	const { "@id": id, ...d } = jsonLd;
	if (typeof id === "string") {
		d.id = id.replace(BASE_URL, "");
	}
	return d as JSONObjectSerializable;
};

const compactJsonLdAndAdhereToSchema = (jsonLd: JSONObjectSerializable, properties: ClassProperties) => {
	jsonLd["@context"] = `http://schema.laji.fi/context/${dropQnamePrefix(dropURI(jsonLd["@type"] as string))}.jsonld`;

	return rmId(
		traverseJsonLd(omitFromArray(Object.keys(jsonLd), ...SKIP_KEYS)
			.reduce<JSONObjectSerializable>((d, k) => {
				const property = properties[dropURI(k)];
				const value: JSONSerializable = jsonLd[k]!;
				if (!property) {
					if (NON_SCHEMATIC_KEYS.includes(k)) {
						d[k] = value;
					}
					return d;
				}

				const transformedValue = pipe(
					maxOccurs(property),
					resolveLangResources(property),
					typeFromRange(property)
				)(value);

				d[unprefix(dropURI(k))] = transformedValue;
				return d;
			}, {} as JSONObjectSerializable),
		resolveResources)
	);
};

const traverseJsonLd = (
	data: JSONObjectSerializable,
	op: (jsonLd: JSONObjectSerializable | JSONSerializable[]
	) => (JSONSerializable | undefined)): JSONObjectSerializable => {
	const traverse = (data: JSONSerializable | JSONSerializable[]): JSONSerializable => {
		if (Array.isArray(data)) {
			const operated = op(data);
			if (operated !== undefined) {
				return operated;
			}
			return data.map(traverse);
		} else if (isObject(data)) {
			const operated = op(data);
			if (operated !== undefined) {
				return operated;
			}
			const keys = (Object.keys(data) as (keyof JSONObjectSerializable)[]);
			return keys.reduce<JSONObjectSerializable>((d, k) => {
				const value = data[k];
				// Should never happen, but doesn't matter if it does.
				// Undefined values have no semantic difference to missing keys.
				// We want the result to be JSON, and JSON doesn't have 'undefined'.
				if (value === undefined) {
					return d;
				}
				d[k] = traverse(value);
				return d;
			}, {});
		}
		return data;
	};

	return traverse(data) as JSONObjectSerializable;
};

const dropQnamePrefix = (qname: string) => qname.replace(/^[^.]+\./, "");
