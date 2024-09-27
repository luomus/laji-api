import { HttpException, Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";
import { parse, serialize, graph } from "rdflib";
import { compact, NodeObject } from "jsonld";
import { isObject, JSONSerializable, JSONObjectSerializable, MaybePromise, RemoteContextual, MaybeContextual,
	MaybeArray } from "../type-utils";
import { CacheOptions, promisePipe } from "src/utils";
import { ContextProperties, MetadataService, Property } from "src/metadata/metadata.service";
import { MultiLang } from "src/common.dto";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { TRIPLESTORE_CLIENT } from "src/provider-tokens";

const BASE_URL = "http://tun.fi/";

type ResourceIdentifierObj = { "@id": string };
const isResourceIdentifier = (data: any): data is ResourceIdentifierObj =>
	isObject(data) && Object.keys(data).length === 1 && "@id" in data;

type MultiLangResource = { "@language": string; "@value": string };
const isMultiLangResource = (data: any): data is MultiLangResource =>
	isObject(data) && "@language" in data;

type TriplestoreSearchQuery = {
	type?: string;
	predicate?: string;
	objectresource?: string;
	objectliteral?: string | boolean;
	limit?: number;
	offset?: string;
	object?: string;
	subject?: string;
}

type TriplestoreQueryOptions = CacheOptions;

const baseQuery = { format: "rdf/xml", limit: 9999999 };

@Injectable()
export class TriplestoreService {
	constructor(
		@Inject(TRIPLESTORE_CLIENT) private triplestoreClient: RestClientService<JSONSerializable>,
		private metadataService: MetadataService,
		private cache: RedisCacheService
	) {
		this.formatJsonLd = this.formatJsonLd.bind(this);
	}

	// TODO returned items @context is different than old lajiapi
	/**
	 * Find a resource from triplestore.
	 * @param resource The resource identifier to get
	 * @param options Cache options
	 */
	async findOne<T>(resource: string, options?: TriplestoreQueryOptions): Promise<T> {
		const { cache } = options || {};
		if (cache) {
			const cached = await this.cache.get<T>(getPathAndQuery(resource));
			if (cached) {
				return cached;
			}
		}
		return this.rdfToJsonLd<T>(
			this.triplestoreClient.get(resource, { params: baseQuery }),
			getPathAndQuery(resource),
			options
		);
	}

	/**
	 * Find multple resources from triplestore.
	 * @param query Query options
	 * @param options Cache options
	 */
	async find<T extends MaybeContextual>(query: TriplestoreSearchQuery = {}, options?: TriplestoreQueryOptions)
		: Promise<RemoteContextual<T>[]> {
		query = { ...baseQuery, ...query };

		const { cache } = options || {};
		if (cache) {
			const cached = await this.cache.get<RemoteContextual<T>[]>(getPathAndQuery("search", query));
			if (cached) {
				return cached;
			}
		}

		let result = await this.rdfToJsonLd<MaybeArray<RemoteContextual<T>>>(
			this.triplestoreClient.get("search", { params: query }),
			getPathAndQuery("search", query),
			options
		);
		if (!Array.isArray(result)) { // Singular results are as non-arrays.
			result = [result];
		}
		return result;
	}

	private async rdfToJsonLd<T>(
		rdf: MaybePromise<JSONSerializable>,
		cacheKey: string,
		options?: TriplestoreQueryOptions
	): Promise<T> {
		const jsonld = await promisePipe(triplestoreToJsonLd)(rdf);
		const isArrayResult = Array.isArray(jsonld["@graph"]);
		if (isArrayResult && (jsonld["@graph"] as any).length === 0) {
			return [] as T;
		}

		const jsonldContext = isArrayResult
			? (jsonld["@graph"] as any)[0]["@type"]
			: jsonld["@type"];
		const metadataContext = await this.metadataService.getPropertiesForContext(
			MetadataService.parseContext(jsonldContext)
		);
		const formatted = (isArrayResult
			? await Promise.all((jsonld["@graph"] as any).map((i: any) =>
				this.formatJsonLd(i, metadataContext))
			)
			: await this.formatJsonLd(jsonld, metadataContext)
		) as T;

		return this.cacheResult(formatted, cacheKey, options) as T;
	}

	private formatJsonLd(jsonld: any, context: ContextProperties) {
		return promisePipe(
			stripBadProps,
			compactJsonLd,
			resolveResources,
			adhereToSchemaWith(context),
			resolveLangResources,
			dropPrefixes,
			rmIdAndType
		)(jsonld);
	}

	private async cacheResult<T>(item: T, cacheKey: string, options?: TriplestoreQueryOptions): Promise<T> {
		options?.cache && await this.cache.set(
			cacheKey,
			item,
			typeof options.cache === "number" ? options.cache : undefined
		);
		return item;
	}
}

const getPathAndQuery = (resource: string, query?: TriplestoreSearchQuery) => {
	return resource + JSON.stringify(query || {});
};

const triplestoreToJsonLd = (rdf: JSONSerializable): Promise<NodeObject> => {
	const rdfStore = graph();
	parse(rdf as any, rdfStore, BASE_URL, "application/rdf+xml");
	const jsonld = serialize(null, rdfStore, BASE_URL, "application/ld+json");
	if (!jsonld) {
		throw new HttpException("Not found in triplestore", 404);
	}
	return JSON.parse(jsonld);
};

const stripBadProps = (jsonld: JSONObjectSerializable) => {
	return traverseJsonLd(jsonld, iteratedJsonLd => {
		if (!Array.isArray(iteratedJsonLd) && iteratedJsonLd["rdfs:label"]) {
			delete iteratedJsonLd["rdfs:label"];
		}
		if (!Array.isArray(iteratedJsonLd) && iteratedJsonLd["rdfs:comment"]) {
			delete iteratedJsonLd["rdfs:comment"];
		}
		return iteratedJsonLd;
	});
};

const compactJsonLd = (jsonld: JSONObjectSerializable) => {
	return compact(jsonld, (jsonld as any)["@type"]) as unknown as Promise<JSONSerializable>;
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

/**
 * JsonLd resources are in the input like { "@id": "http://tun.fi/MOS.500" }.
 * This function resolves those resources into values like "MOS.500".
 */
const resolveResources = (data: JSONObjectSerializable): JSONObjectSerializable => {
	return traverseJsonLd(data, (value: JSONObjectSerializable | JSONSerializable[]) => {
		if (isResourceIdentifier(value)) {
			return value["@id"].replace(BASE_URL, "");
		}
	});
};

const resolveLangResources = (data: JSONObjectSerializable): JSONObjectSerializable => {
	return traverseJsonLd(data, (value: JSONObjectSerializable | JSONSerializable[]) => {
		if (Array.isArray(value) && isMultiLangResource(value[0])) {
			return value.reduce<MultiLang>((langObj: MultiLang, resource: MultiLangResource) => ({
				...langObj,
				[resource["@language"]]: resource["@value"]
			}), {});
		}
	});
};

/** RDF doesn't know about our properties' schema info. This function makes the output adhere to the schema. */
const adhereToSchemaWith = (properties: ContextProperties) => async (data: JSONObjectSerializable) => {
	function asArray(value: JSONSerializable, property: Property) {
		if (property?.maxOccurs === "unbounded" && value && !Array.isArray(value)) {
			return [value];
		}
	}

	function multiLangAsArr(value: JSONSerializable, property: Property) {
		if (property.multiLanguage && value && !Array.isArray(value)) {
			return [value];
		}
	}

	function typeFromRange(value: JSONSerializable, property: Property) {
		const { range } = property;
		if (range?.length === 1 && range[0] === "xsd:boolean") {
			if (value === "true") {
				return true;
			}
			if (value === "false") {
				return false;
			}
		}
	}

	const transformations: ((value: JSONSerializable, property: Property) => JSONSerializable | undefined)[] =
		[asArray, multiLangAsArr, typeFromRange];

	return (Object.keys(data) as (keyof JSONObjectSerializable)[]).reduce<JSONObjectSerializable>((d, k) => {
		const property = properties[k];
		let value: JSONSerializable = data[k]!;
		if (!property) {
			d[k] = value;
			return d;
		}
		for (const transform of transformations) {
			const transformed = transform(value, property);
			if (transformed !== undefined) {
				value = transformed;
			}
		}

		d[k] = value;
		return d;
	}, {} as JSONObjectSerializable);
};

const dropPrefixes = (data: JSONObjectSerializable) => {
	const unprefix = (k: string) => k.split(".").pop() as string;

	return (Object.keys(data) as string[]).reduce<JSONObjectSerializable>((d, k) => {
		d[unprefix(k)] = data[k]!;
		return d;
	}, {});
};

const rmIdAndType = (data: JSONObjectSerializable) => {
	const { "@type": type, "@id": id, ...d } = data;
	if (typeof id === "string") {
		d.id = id.replace(BASE_URL, "");
	}
	return d;
};
